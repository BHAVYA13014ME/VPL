const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');

/**
 * Calculate and update user leaderboard points based on real activity
 * @param {String} userId - User ID
 * @param {String} activity - Type of activity completed
 * @param {Object} metadata - Additional data for point calculation
 */
const updateUserLeaderboard = async (userId, activity, metadata = {}) => {
  try {
    // Find or create leaderboard entry
    let leaderboardEntry = await Leaderboard.findOne({
      user: userId,
      category: 'overall',
      period: 'all_time'
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new Leaderboard({
        user: userId,
        category: 'overall',
        period: 'all_time',
        points: 0,
        level: 1
      });
    }

    // Points system based on activities
    let pointsToAdd = 0;
    let badgesToCheck = [];
    let achievementsToCheck = [];

    switch (activity) {
      case 'course_enrolled':
        pointsToAdd = 10;
        break;

      case 'course_completed':
        pointsToAdd = 100;
        await leaderboardEntry.updateStatistics({
          coursesCompleted: (leaderboardEntry.statistics.coursesCompleted || 0) + 1
        });
        badgesToCheck.push('course_explorer');
        achievementsToCheck.push('first_course_completed');
        break;

      case 'lesson_completed':
        pointsToAdd = 20;
        break;

      case 'assignment_submitted':
        pointsToAdd = 30;
        await leaderboardEntry.updateStatistics({
          assignmentsSubmitted: (leaderboardEntry.statistics.assignmentsSubmitted || 0) + 1
        });
        achievementsToCheck.push('first_assignment_submitted');
        break;

      case 'assignment_graded':
        const grade = metadata.grade || 0;
        // Award points based on grade (0-100 scale)
        pointsToAdd = Math.round(grade / 2); // Max 50 points for 100% score
        
        // Bonus for high scores
        if (grade === 100) {
          pointsToAdd += 50; // Total 100 points for perfect score
          achievementsToCheck.push('perfect_score');
        } else if (grade >= 90) {
          pointsToAdd += 20;
        } else if (grade >= 80) {
          pointsToAdd += 10;
        }

        badgesToCheck.push('assignment_master');
        badgesToCheck.push('high_achiever');
        break;

      case 'quiz_completed':
        const quizScore = metadata.score || 0;
        pointsToAdd = Math.round(quizScore / 5); // Max 20 points for 100% quiz
        break;

      case 'discussion_post':
        pointsToAdd = 5;
        await leaderboardEntry.updateStatistics({
          discussionPosts: (leaderboardEntry.statistics.discussionPosts || 0) + 1
        });
        break;

      case 'helpful_vote_received':
        pointsToAdd = 3;
        await leaderboardEntry.updateStatistics({
          helpfulVotes: (leaderboardEntry.statistics.helpfulVotes || 0) + 1
        });
        break;

      case 'study_streak':
        const streakDays = metadata.days || 0;
        pointsToAdd = streakDays * 5; // 5 points per day in streak
        
        await leaderboardEntry.updateStatistics({
          'statistics.studyStreak.current': streakDays,
          'statistics.studyStreak.lastStudyDate': new Date()
        });

        badgesToCheck.push('consistent_learner');
        
        if (streakDays >= 7) achievementsToCheck.push('study_streak_7');
        if (streakDays >= 30) achievementsToCheck.push('study_streak_30');
        break;

      case 'course_created':
        pointsToAdd = 200;
        await leaderboardEntry.updateStatistics({
          coursesCreated: (leaderboardEntry.statistics.coursesCreated || 0) + 1
        });
        achievementsToCheck.push('course_creator');
        break;

      default:
        console.log(`Unknown activity type: ${activity}`);
        return leaderboardEntry;
    }

    // Add points
    if (pointsToAdd > 0) {
      await leaderboardEntry.addPoints(pointsToAdd, activity);
    }

    // Check and award badges
    for (const badgeType of badgesToCheck) {
      await checkAndAwardBadge(userId, badgeType, leaderboardEntry);
    }

    // Check and unlock achievements
    for (const achievementType of achievementsToCheck) {
      await checkAndUnlockAchievement(userId, achievementType, leaderboardEntry);
    }

    // Update average score
    await updateAverageScore(userId);

    return leaderboardEntry;
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    throw error;
  }
};

/**
 * Check and award badge based on user statistics
 */
const checkAndAwardBadge = async (userId, badgeType, leaderboardEntry) => {
  try {
    const stats = leaderboardEntry.statistics;

    let shouldAward = false;
    let level = 1;
    let badgeName = '';
    let description = '';
    let color = '#cd7f32';

    switch (badgeType) {
      case 'course_explorer':
        if (stats.coursesCompleted >= 25) {
          level = 3;
          badgeName = 'Gold Course Explorer';
          description = 'Completed 25+ courses';
          color = '#ffd700';
          shouldAward = true;
        } else if (stats.coursesCompleted >= 10) {
          level = 2;
          badgeName = 'Silver Course Explorer';
          description = 'Completed 10+ courses';
          color = '#c0c0c0';
          shouldAward = true;
        } else if (stats.coursesCompleted >= 3) {
          level = 1;
          badgeName = 'Bronze Course Explorer';
          description = 'Completed 3+ courses';
          color = '#cd7f32';
          shouldAward = true;
        }
        break;

      case 'assignment_master':
        if (stats.assignmentsSubmitted >= 50) {
          level = 3;
          badgeName = 'Gold Assignment Master';
          description = 'Submitted 50+ assignments';
          color = '#ffd700';
          shouldAward = true;
        } else if (stats.assignmentsSubmitted >= 25) {
          level = 2;
          badgeName = 'Silver Assignment Master';
          description = 'Submitted 25+ assignments';
          color = '#c0c0c0';
          shouldAward = true;
        } else if (stats.assignmentsSubmitted >= 10) {
          level = 1;
          badgeName = 'Bronze Assignment Master';
          description = 'Submitted 10+ assignments';
          color = '#cd7f32';
          shouldAward = true;
        }
        break;

      case 'consistent_learner':
        const streakDays = stats.studyStreak?.current || 0;
        if (streakDays >= 100) {
          level = 3;
          badgeName = 'Gold Consistent Learner';
          description = '100+ day learning streak';
          color = '#ffd700';
          shouldAward = true;
        } else if (streakDays >= 30) {
          level = 2;
          badgeName = 'Silver Consistent Learner';
          description = '30+ day learning streak';
          color = '#c0c0c0';
          shouldAward = true;
        } else if (streakDays >= 7) {
          level = 1;
          badgeName = 'Bronze Consistent Learner';
          description = '7+ day learning streak';
          color = '#cd7f32';
          shouldAward = true;
        }
        break;

      case 'high_achiever':
        if (stats.averageScore >= 95) {
          level = 3;
          badgeName = 'Gold High Achiever';
          description = 'Maintaining 95%+ average';
          color = '#ffd700';
          shouldAward = true;
        } else if (stats.averageScore >= 90) {
          level = 2;
          badgeName = 'Silver High Achiever';
          description = 'Maintaining 90%+ average';
          color = '#c0c0c0';
          shouldAward = true;
        } else if (stats.averageScore >= 85) {
          level = 1;
          badgeName = 'Bronze High Achiever';
          description = 'Maintaining 85%+ average';
          color = '#cd7f32';
          shouldAward = true;
        }
        break;
    }

    if (shouldAward) {
      // Check if badge already exists at this level
      const existingBadge = leaderboardEntry.badges.find(
        b => b.name === badgeName
      );

      if (!existingBadge) {
        await leaderboardEntry.awardBadge({
          name: badgeName,
          description,
          icon: badgeType,
          color,
          rarity: level === 3 ? 'epic' : level === 2 ? 'rare' : 'common'
        });
        console.log(`Awarded badge: ${badgeName} to user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error checking badge:', error);
  }
};

/**
 * Check and unlock achievement
 */
const checkAndUnlockAchievement = async (userId, achievementType, leaderboardEntry) => {
  try {
    // Check if already unlocked
    const existing = leaderboardEntry.achievements.find(a => a.type === achievementType);
    if (existing) return;

    let shouldUnlock = false;
    let title = '';
    let description = '';
    let points = 0;

    switch (achievementType) {
      case 'first_course_completed':
        if (leaderboardEntry.statistics.coursesCompleted >= 1) {
          shouldUnlock = true;
          title = 'First Steps';
          description = 'Completed your first course';
          points = 50;
        }
        break;

      case 'first_assignment_submitted':
        if (leaderboardEntry.statistics.assignmentsSubmitted >= 1) {
          shouldUnlock = true;
          title = 'Assignment Pioneer';
          description = 'Submitted your first assignment';
          points = 30;
        }
        break;

      case 'perfect_score':
        shouldUnlock = true;
        title = 'Perfectionist';
        description = 'Achieved a perfect score on an assignment';
        points = 100;
        break;

      case 'study_streak_7':
        shouldUnlock = true;
        title = 'Week Warrior';
        description = 'Maintained a 7-day study streak';
        points = 75;
        break;

      case 'study_streak_30':
        shouldUnlock = true;
        title = 'Monthly Master';
        description = 'Maintained a 30-day study streak';
        points = 300;
        break;

      case 'course_creator':
        shouldUnlock = true;
        title = 'Knowledge Sharer';
        description = 'Created your first course';
        points = 200;
        break;
    }

    if (shouldUnlock) {
      await leaderboardEntry.unlockAchievement({
        type: achievementType,
        title,
        description,
        points
      });
      console.log(`Unlocked achievement: ${title} for user ${userId}`);
    }
  } catch (error) {
    console.error('Error checking achievement:', error);
  }
};

/**
 * Update user's average score based on all graded assignments
 */
const updateAverageScore = async (userId) => {
  try {
    const assignments = await Assignment.find({
      'submissions.student': userId
    }).select('submissions');

    let totalScore = 0;
    let gradedCount = 0;

    assignments.forEach(assignment => {
      const userSubmission = assignment.submissions.find(
        sub => sub.student.toString() === userId.toString()
      );
      
      if (userSubmission && userSubmission.grade !== undefined && userSubmission.grade !== null) {
        totalScore += userSubmission.grade;
        gradedCount++;
      }
    });

    const averageScore = gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0;

    await Leaderboard.findOneAndUpdate(
      { user: userId, category: 'overall', period: 'all_time' },
      { 'statistics.averageScore': averageScore },
      { new: true }
    );

    return averageScore;
  } catch (error) {
    console.error('Error updating average score:', error);
    throw error;
  }
};

/**
 * Recalculate all user rankings based on current points
 */
const recalculateAllRanks = async () => {
  try {
    const entries = await Leaderboard.find({
      category: 'overall',
      period: 'all_time'
    }).sort({ points: -1 });

    for (let i = 0; i < entries.length; i++) {
      entries[i].rank = i + 1;
      await entries[i].save();
    }

    console.log(`Recalculated ranks for ${entries.length} users`);
    return entries.length;
  } catch (error) {
    console.error('Error recalculating ranks:', error);
    throw error;
  }
};

/**
 * Initialize leaderboard for all existing students
 */
const initializeLeaderboardForAllUsers = async () => {
  try {
    const students = await User.find({ role: 'student' });
    
    for (const student of students) {
      let entry = await Leaderboard.findOne({
        user: student._id,
        category: 'overall',
        period: 'all_time'
      });

      if (!entry) {
        entry = new Leaderboard({
          user: student._id,
          category: 'overall',
          period: 'all_time',
          points: 0,
          level: 1
        });
        await entry.save();
      }

      // Calculate real statistics from existing data
      const enrolledCourses = await User.findById(student._id)
        .populate('enrolledCourses.course')
        .select('enrolledCourses');

      const coursesCompleted = enrolledCourses.enrolledCourses.filter(
        ec => ec.progress >= 100
      ).length;

      const assignments = await Assignment.find({
        'submissions.student': student._id
      });

      const assignmentsSubmitted = assignments.length;

      // Calculate average score
      let totalScore = 0;
      let gradedCount = 0;
      
      assignments.forEach(assignment => {
        const userSubmission = assignment.submissions.find(
          sub => sub.student.toString() === student._id.toString()
        );
        if (userSubmission && userSubmission.grade !== undefined) {
          totalScore += userSubmission.grade;
          gradedCount++;
        }
      });

      const averageScore = gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0;

      // Update statistics
      await entry.updateStatistics({
        coursesCompleted,
        assignmentsSubmitted,
        averageScore
      });

      // Award initial points based on existing activity
      const basePoints = (coursesCompleted * 100) + (assignmentsSubmitted * 30);
      if (basePoints > 0 && entry.points === 0) {
        await entry.addPoints(basePoints, 'initial_calculation');
      }

      console.log(`Initialized leaderboard for ${student.firstName} ${student.lastName}`);
    }

    // Recalculate ranks
    await recalculateAllRanks();

    console.log(`Initialized leaderboard for ${students.length} students`);
    return students.length;
  } catch (error) {
    console.error('Error initializing leaderboard:', error);
    throw error;
  }
};

module.exports = {
  updateUserLeaderboard,
  recalculateAllRanks,
  initializeLeaderboardForAllUsers,
  updateAverageScore
};
