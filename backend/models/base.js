/**
 * Mongoose-compatible base model built on top of node-postgres.
 *
 * Every table follows the pattern:
 *   id UUID PK  |  <scalar indexed cols>  |  data JSONB  |  created_at  |  updated_at
 *
 * The JSONB `data` column stores all non-indexed fields.
 * When a row is fetched, scalar columns are merged with `data` to form a
 * JavaScript object that looks just like a Mongoose document.
 */

const { pool } = require('../db');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a pg row into a plain document object */
function rowToPlain(row, scalarCols) {
  if (!row) return null;
  const doc = Object.assign({}, row.data || {});
  doc._id = row.id;
  doc.id  = row.id;
  doc.createdAt = row.created_at;
  doc.updatedAt = row.updated_at;

  for (const [jsName, colName] of Object.entries(scalarCols)) {
    if (row[colName] !== undefined) doc[jsName] = row[colName];
  }
  return doc;
}

/** Build a WHERE clause + params from a mongo-style query object */
function buildWhere(query, scalarCols, startIdx = 1) {
  const conds  = [];
  const params = [];
  let   idx    = startIdx;

  for (const [key, value] of Object.entries(query || {})) {
    if (key === '$or') {
      const orClauses = value.map(subQ => {
        const sub = buildWhere(subQ, scalarCols, idx);
        idx += sub.params.length;
        params.push(...sub.params);
        return `(${sub.conds.join(' AND ')})`;
      });
      conds.push(`(${orClauses.join(' OR ')})`);
      continue;
    }

    if (key === '_id' || key === 'id') {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        for (const [op, opVal] of Object.entries(value)) {
          if (op === '$in')  { params.push(opVal); conds.push(`id = ANY($${idx++})`); }
          if (op === '$nin') { params.push(opVal); conds.push(`NOT (id = ANY($${idx++}))`); }
          if (op === '$ne')  { params.push(opVal); conds.push(`id != $${idx++}`); }
        }
      } else {
        params.push(value);
        conds.push(`id = $${idx++}`);
      }
      continue;
    }

    // Check scalar column
    if (scalarCols[key]) {
      const colName = scalarCols[key];
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Operators like { $gt, $lt, $in, $ne }
        for (const [op, opVal] of Object.entries(value)) {
          if (op === '$gt')  { params.push(opVal); conds.push(`${colName} > $${idx++}`); }
          if (op === '$gte') { params.push(opVal); conds.push(`${colName} >= $${idx++}`); }
          if (op === '$lt')  { params.push(opVal); conds.push(`${colName} < $${idx++}`); }
          if (op === '$lte') { params.push(opVal); conds.push(`${colName} <= $${idx++}`); }
          if (op === '$ne')  { params.push(opVal); conds.push(`${colName} != $${idx++}`); }
          if (op === '$in')  { params.push(opVal); conds.push(`${colName} = ANY($${idx++})`); }
        }
      } else {
        params.push(value);
        conds.push(`${colName} = $${idx++}`);
      }
      continue;
    }

    // JSONB path (supports dot-notation and operators)
    const parts = key.split('.');
    // Build proper JSONB accessor: data->'a'->'b'->>'c'
    const buildJsonbPath = (ps) => {
      if (ps.length === 1) return `data->>'${ps[0]}'`;
      const inner = ps.slice(0, -1).map(p => `->'${p}'`).join('');
      return `data${inner}->>'${ps[ps.length - 1]}'`;
    };
    const jsonbPath = buildJsonbPath(parts);

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const operators = Object.keys(value);
      if (operators.some(op => op.startsWith('$'))) {
        const numericPath = parts.length > 1
          ? `(data${parts.slice(0,-1).map(p=>`->'${p}'`).join('')}->>'${parts[parts.length-1]}')::numeric`
          : `(data->>'${parts[0]}')::numeric`;
        for (const [op, opVal] of Object.entries(value)) {
          if (op === '$in')    { params.push(opVal); conds.push(`${jsonbPath} = ANY($${idx++}::text[])`); }
          else if (op === '$gt')  { params.push(String(opVal)); conds.push(`${numericPath} > $${idx++}`); }
          else if (op === '$gte') { params.push(String(opVal)); conds.push(`${numericPath} >= $${idx++}`); }
          else if (op === '$lt')  { params.push(String(opVal)); conds.push(`${numericPath} < $${idx++}`); }
          else if (op === '$lte') { params.push(String(opVal)); conds.push(`${numericPath} <= $${idx++}`); }
          else if (op === '$ne')  { params.push(String(opVal)); conds.push(`${jsonbPath} != $${idx++}`); }
          else if (op === '$exists') { conds.push(opVal ? `${jsonbPath} IS NOT NULL` : `${jsonbPath} IS NULL`); }
        }
        continue;
      }
    }

    if (value === null) {
      conds.push(`${jsonbPath} IS NULL`);
    } else if (typeof value === 'boolean') {
      params.push(String(value));
      conds.push(`${jsonbPath} = $${idx++}`);
    } else if (typeof value === 'number') {
      params.push(String(value));
      conds.push(`(${jsonbPath})::numeric = $${idx++}`);;
    } else if (key === '$text') {
      params.push(`%${value.$search}%`);
      conds.push(`data::text ILIKE $${idx++}`);
    } else {
      params.push(String(value));
      conds.push(`${jsonbPath} = $${idx++}`);
    }
  }

  if (conds.length === 0) conds.push('1=1');
  return { conds, params };
}

/** Build ORDER BY clause from mongoose sort object */
function buildOrderBy(sort, scalarCols = {}) {
  if (!sort || Object.keys(sort).length === 0) return '';
  const parts = [];
  for (const [field, dir] of Object.entries(sort)) {
    const direction = dir === -1 || dir === 'desc' ? 'DESC' : 'ASC';
    if (field === 'createdAt') { parts.push(`created_at ${direction}`); continue; }
    if (field === 'updatedAt') { parts.push(`updated_at ${direction}`); continue; }
    if (scalarCols[field])     { parts.push(`${scalarCols[field]} ${direction}`); continue; }
    // JSONB path (may be nested like 'rating.average')
    const ps = field.split('.');
    if (ps.length > 1) {
      const expr = `(data${ps.slice(0,-1).map(p=>`->'${p}'`).join('')}->>'${ps[ps.length-1]}')::numeric`;
      parts.push(`${expr} ${direction}`);
    } else {
      parts.push(`(data->>'${field}') ${direction}`);
    }
  }
  return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
}

// ── Populate registry (set by each model) ────────────────────────────────────
const modelRegistry = {};
function registerModel(name, model) {
  modelRegistry[name] = model;
}

// ── Query class (chainable) ──────────────────────────────────────────────────
class Query {
  constructor(Model, sqlBase, params, scalarCols, multiDoc = true) {
    this._Model      = Model;
    this._sqlBase    = sqlBase;   // SELECT … FROM table WHERE …
    this._params     = params;
    this._scalarCols = scalarCols;
    this._multiDoc   = multiDoc;
    this._populates  = [];
    this._select     = null;
    this._sort       = null;
    this._limit      = null;
    this._skip       = null;
    this._lean       = false;
    this._selectPass = false;
  }

  populate(pathOrObj, select) {
    if (typeof pathOrObj === 'object' && pathOrObj !== null) {
      // .populate({ path, populate: { path, select } })
      this._populates.push(pathOrObj);
    } else {
      this._populates.push({ path: pathOrObj, select });
    }
    return this;
  }

  select(fields) {
    this._select = fields;
    if (typeof fields === 'string' && fields.includes('+password')) {
      this._selectPass = true;
    }
    return this;
  }

  sort(s)    { this._sort  = s; return this; }
  limit(n)   { this._limit = n; return this; }
  skip(n)    { this._skip  = n; return this; }
  lean()     { this._lean  = true; return this; }

  // Make Query awaitable
  then(res, rej)  { return this.exec().then(res, rej); }
  catch(rej)      { return this.exec().catch(rej); }
  finally(fn)     { return this.exec().finally(fn); }

  async exec() {
    let sql    = this._sqlBase;
    const params = [...this._params];

    // Sorting
    const order = buildOrderBy(this._sort, this._scalarCols);
    if (order) sql += ` ${order}`;

    // Pagination
    if (this._limit != null) { params.push(this._limit); sql += ` LIMIT $${params.length}`; }
    if (this._skip  != null) { params.push(this._skip);  sql += ` OFFSET $${params.length}`; }

    const result = await pool.query(sql, params);
    const rows   = result.rows;

    // Collect all docs as plain objects
    let docs = rows.map(row => {
      const plain = rowToPlain(row, this._scalarCols);
      // password handling: strip unless +password selected
      if (!this._selectPass) delete plain.password;
      else if (row.password) plain.password = row.password;
      return plain;
    });

    // Apply populates
    if (this._populates.length) {
      docs = await applyPopulates(docs, this._populates);
    }

    if (this._lean) {
      return this._multiDoc ? docs : docs[0] || null;
    }

    // Wrap as Document instances
    const wrapped = docs.map(d => this._Model._makeDoc(d));
    return this._multiDoc ? wrapped : wrapped[0] || null;
  }
}

// ── Populate helper ───────────────────────────────────────────────────────────
const PATH_TO_MODEL = {
  instructor : 'User',
  student    : 'User',
  user       : 'User',
  caller     : 'User',
  receiver   : 'User',
  course     : 'Course',
  gradedBy   : 'User',
};

async function applyPopulates(docs, populates) {
  for (const pop of populates) {
    const path   = pop.path || pop;
    const select = pop.select;
    const nested = pop.populate; // for nested populate

    const parts = typeof path === 'string' ? path.split('.') : [path];

    if (parts.length === 1) {
      const field = parts[0];
      const ModelName = PATH_TO_MODEL[field];
      if (!ModelName || !modelRegistry[ModelName]) continue;

      const RelModel  = modelRegistry[ModelName];
      const ids = [...new Set(docs.map(d => d[field]).filter(v => v && typeof v === 'string'))];
      if (!ids.length) continue;

      const relDocs = await RelModel.find({ _id: { $in: ids } });
      const map = {};
      relDocs.forEach(r => { map[r._id] = r; });

      docs.forEach(d => { if (d[field]) d[field] = map[d[field]] || d[field]; });

      // Nested populate
      if (nested) {
        const relDocsArr = docs.map(d => d[field]).filter(Boolean);
        await applyPopulates(relDocsArr, [nested]);
      }

    } else if (parts.length === 2) {
      const arrayField = parts[0]; // e.g. enrolledCourses
      const subField   = parts[1]; // e.g. course
      const ModelName  = PATH_TO_MODEL[subField];
      if (!ModelName || !modelRegistry[ModelName]) continue;

      const RelModel = modelRegistry[ModelName];
      const ids = [];
      docs.forEach(d => {
        const arr = d[arrayField];
        if (Array.isArray(arr)) arr.forEach(item => { if (item && item[subField]) ids.push(item[subField]); });
      });
      const uniqueIds = [...new Set(ids.filter(Boolean))];
      if (!uniqueIds.length) continue;

      const relDocs = await RelModel.find({ _id: { $in: uniqueIds } });
      const map = {};
      relDocs.forEach(r => { map[r._id] = r; });

      docs.forEach(d => {
        const arr = d[arrayField];
        if (Array.isArray(arr)) {
          d[arrayField] = arr.map(item => {
            if (item && item[subField]) return { ...item, [subField]: map[item[subField]] || item[subField] };
            return item;
          });
        }
      });

      if (nested) {
        const subDocs = docs.flatMap(d => {
          const arr = d[arrayField];
          return Array.isArray(arr) ? arr.map(i => i && i[subField]).filter(Boolean) : [];
        });
        await applyPopulates(subDocs, [nested]);
      }
    }
  }
  return docs;
}

// ── Document class ──────────────────────────────────────────────────────────
class Document {
  constructor(plain, Model) {
    Object.assign(this, plain);
    this.__Model = Model;
    this.__isNew = !plain._id;
  }

  async save(opts) {
    const data = this._cleanForSave();
    if (this.__isNew) {
      const saved = await this.__Model.create(data);
      // Merge only scalar data props, not virtuals/methods
      const plain = saved._cleanForSave ? saved._cleanForSave() : saved;
      for (const [k, v] of Object.entries(plain)) { if (typeof v !== 'function') this[k] = v; }
      this.__isNew = false;
    } else {
      const plain = await this.__Model._updateById(this._id, data);
      if (plain) { for (const [k, v] of Object.entries(plain)) { if (typeof v !== 'function') this[k] = v; } }
    }
    return this;
  }

  toObject() { return this._cleanForSave(); }
  toJSON()   { return this._cleanForSave(); }

  _cleanForSave() {
    const obj = {};
    for (const [k, v] of Object.entries(this)) {
      if (k.startsWith('__')) continue;
      if (typeof v === 'function') continue;
      obj[k] = v;
    }
    return obj;
  }

  // Chainable populate on an instance
  async populate(path, select) {
    const docs = [this._cleanForSave()];
    await applyPopulates(docs, [{ path, select }]);
    Object.assign(this, docs[0]);
    return this;
  }
}

// ── BaseModel ────────────────────────────────────────────────────────────────
class BaseModel {
  /**
   * @param {string}  tableName   - postgres table name
   * @param {object}  scalarCols  - { jsFieldName: 'column_name' } for indexed SQL cols
   * @param {object}  defaults    - default field values for new docs
   * @param {function} onAfterLoad - optional post-load hook (add virtuals/methods)
   */
  constructor(tableName, scalarCols = {}, defaults = {}, onAfterLoad = null) {
    this.tableName   = tableName;
    this.scalarCols  = scalarCols;   // { jsName: 'sql_col' }
    this.defaults    = defaults;
    this._onAfterLoad = onAfterLoad;
  }

  // ── Internal: split a plain object into {scalarValues, jsonbData} ──────────
  _splitDoc(plain) {
    const scalarValues = {};
    const jsonbData    = {};

    for (const [k, v] of Object.entries(plain)) {
      if (k === '_id' || k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
      if (this.scalarCols[k]) {
        scalarValues[this.scalarCols[k]] = v;
      } else {
        jsonbData[k] = v;
      }
    }
    return { scalarValues, jsonbData };
  }

  // ── Internal: make a Document from a plain object ─────────────────────────
  _makeDoc(plain) {
    if (!plain) return null;
    // Apply defaults for missing fields
    for (const [k, v] of Object.entries(this.defaults)) {
      if (plain[k] === undefined || plain[k] === null) {
        plain[k] = typeof v === 'function' ? v() : (Array.isArray(v) ? [] : v);
      }
    }
    const doc = new Document(plain, this);
    if (this._onAfterLoad) this._onAfterLoad(doc);
    return doc;
  }

  // ── Internal: update a row by id ──────────────────────────────────────────
  async _updateById(id, data) {
    const { scalarValues, jsonbData } = this._splitDoc(data);
    const setClauses = [];
    const params     = [];
    let   idx        = 1;

    for (const [col, val] of Object.entries(scalarValues)) {
      params.push(val);
      setClauses.push(`${col} = $${idx++}`);
    }
    params.push(JSON.stringify(jsonbData));
    setClauses.push(`data = $${idx++}`);
    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(sql, params);
    return result.rows[0] ? rowToPlain(result.rows[0], this.scalarCols) : null;
  }

  // ── Build base SELECT from a mongo-style where query ─────────────────────
  _selectSQL(query) {
    const { conds, params } = buildWhere(query, this.scalarCols);
    const where = conds.join(' AND ');
    return {
      sql   : `SELECT * FROM ${this.tableName} WHERE ${where}`,
      params,
    };
  }

  // ── Static-like methods ───────────────────────────────────────────────────

  findOne(query) {
    const { sql, params } = this._selectSQL(query);
    return new Query(this, sql, params, this.scalarCols, false);
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  find(query = {}) {
    const { sql, params } = this._selectSQL(query);
    return new Query(this, sql, params, this.scalarCols, true);
  }

  async countDocuments(query = {}) {
    const { conds, params } = buildWhere(query, this.scalarCols);
    const where = conds.join(' AND ');
    const sql = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${where}`;
    const result = await pool.query(sql, params);
    return parseInt(result.rows[0].count, 10);
  }

  async create(data) {
    // Apply defaults
    const plain = {};
    for (const [k, v] of Object.entries(this.defaults)) {
      plain[k] = typeof v === 'function' ? v() : (Array.isArray(v) ? [] : v);
    }
    Object.assign(plain, data);

    const { scalarValues, jsonbData } = this._splitDoc(plain);

    const cols   = ['data'];
    const vals   = [JSON.stringify(jsonbData)];
    const places = ['$1'];
    let   idx    = 2;

    for (const [col, val] of Object.entries(scalarValues)) {
      cols.push(col);
      vals.push(val);
      places.push(`$${idx++}`);
    }

    const sql    = `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${places.join(', ')}) RETURNING *`;
    const result = await pool.query(sql, vals);
    const rowPlain = rowToPlain(result.rows[0], this.scalarCols);
    return this._makeDoc(rowPlain);
  }

  async findByIdAndUpdate(id, update, opts = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;

    // Handle $set / $push / $inc operators
    let changes = update;
    if (update.$set) {
      changes = update.$set;
    }
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        const arr = existing[k] || [];
        arr.push(v);
        existing[k] = arr;
      }
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        existing[k] = (existing[k] || 0) + v;
      }
    }
    if (update.$pull) {
      for (const [k, v] of Object.entries(update.$pull)) {
        const arr = existing[k] || [];
        if (typeof v === 'object') {
          // filter matching items
          existing[k] = arr.filter(item => {
            for (const [fk, fv] of Object.entries(v)) {
              if (item[fk] === fv) return false;
            }
            return true;
          });
        } else {
          existing[k] = arr.filter(item => item !== v);
        }
      }
    }
    Object.assign(existing, changes);

    const plain = existing._cleanForSave ? existing._cleanForSave() : existing;
    const saved = await this._updateById(id, plain);
    return opts.new !== false ? this._makeDoc(saved) : existing;
  }

  async findOneAndUpdate(query, update, opts = {}) {
    const doc = await this.findOne(query);
    if (!doc) return null;
    return this.findByIdAndUpdate(doc._id, update, opts);
  }

  async findByIdAndDelete(id) {
    const result = await pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0] ? rowToPlain(result.rows[0], this.scalarCols) : null;
  }

  async deleteOne(query) {
    const { conds, params } = buildWhere(query, this.scalarCols);
    const sql = `DELETE FROM ${this.tableName} WHERE ${conds.join(' AND ')} LIMIT 1`;
    await pool.query(sql, params);
    return { deletedCount: 1 };
  }

  async deleteMany(query) {
    const { conds, params } = buildWhere(query, this.scalarCols);
    const sql = `DELETE FROM ${this.tableName} WHERE ${conds.join(' AND ')}`;
    const result = await pool.query(sql, params);
    return { deletedCount: result.rowCount };
  }

  /**
   * Alias: `new Model(data)` returns a Document that can be saved.
   * Usage:  const doc = new Model({ ... }); await doc.save();
   */
  new(data) {
    const plain = Object.assign({}, this.defaults, data);
    const doc = new Document(plain, this);
    doc.__isNew = true;
    if (this._onAfterLoad) this._onAfterLoad(doc);
    return doc;
  }
}

module.exports = { BaseModel, Document, registerModel, modelRegistry };
