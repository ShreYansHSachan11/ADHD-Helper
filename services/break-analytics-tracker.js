/**
 * Break Analytics Tracker - Records and analyzes break session data
 * Tracks break patterns, statistics, and provides insights for user behavior
 */

class BreakAnalyticsTracker {
  constructor() {
    // Storage keys for analytics data
    this.STORAGE_KEYS = {
      BREAK_SESSIONS: 'breakSessions',
      ANALYTICS_SETTINGS: 'analyticsSettings',
      DAILY_STATS: 'dailyBreakStats',
      WEEKLY_STATS: 'weeklyBreakStats',
      MONTHLY_STATS: 'monthlyBreakStats'
    };
    
    // Data retention settings (in days)
    this.DATA_RETENTION = {
      SESSIONS: 90,      // Keep individual sessions for 90 days
      DAILY_STATS: 365,  // Keep daily aggregates for 1 year
      WEEKLY_STATS: 730, // Keep weekly aggregates for 2 years
      MONTHLY_STATS: 1095 // Keep monthly aggregates for 3 years
    };
    
    // Dependencies
    this.storageManager = null;
    
    this.init();
  }

  /**
   * Initialize the analytics tracker
   */
  async init() {
    try {
      // Import dependencies if in service worker context
      if (typeof importScripts !== "undefined") {
        importScripts("/services/storage-manager.js");
        this.storageManager = new StorageManager();
      } else {
        this.storageManager = this.storageManager || new StorageManager();
      }
      
      // Initialize default settings
      await this.initializeDefaultSettings();
      
      console.log("BreakAnalyticsTracker initialized successfully");
    } catch (error) {
      console.error("BreakAnalyticsTracker initialization error:", error);
    }
  }

  /**
   * Initialize default analytics settings
   */
  async initializeDefaultSettings() {
    try {
      const existingSettings = await this.storageManager.get(this.STORAGE_KEYS.ANALYTICS_SETTINGS);
      
      if (!existingSettings) {
        const defaultSettings = {
          trackingEnabled: true,
          dataRetentionDays: this.DATA_RETENTION.SESSIONS,
          lastCleanupDate: Date.now(),
          aggregationEnabled: true
        };
        
        await this.storageManager.set(this.STORAGE_KEYS.ANALYTICS_SETTINGS, defaultSettings);
      }
    } catch (error) {
      console.error("Error initializing default settings:", error);
    }
  }

  /**
   * Record a break session with metadata
   */
  async recordBreakSession(breakType, durationMinutes, startTime, endTime, metadata = {}) {
    try {
      const settings = await this.storageManager.get(this.STORAGE_KEYS.ANALYTICS_SETTINGS);
      
      if (!settings || !settings.trackingEnabled) {
        console.log("Break tracking is disabled");
        return false;
      }

      const session = {
        id: `break_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: breakType,
        plannedDuration: durationMinutes,
        actualDuration: endTime > 0 ? Math.round((endTime - startTime) / (1000 * 60)) : 0, // Convert to minutes, 0 if cancelled
        startTime: startTime,
        endTime: endTime,
        date: new Date(startTime).toISOString().split('T')[0], // YYYY-MM-DD format
        dayOfWeek: new Date(startTime).getDay(), // 0 = Sunday, 6 = Saturday
        hour: new Date(startTime).getHours(),
        completed: endTime > 0, // Whether break was completed or cancelled
        metadata: {
          workTimeBeforeBreak: metadata.workTimeBeforeBreak || 0,
          triggeredBy: metadata.triggeredBy || 'unknown', // 'notification', 'manual', 'automatic'
          browserActive: metadata.browserActive !== false,
          ...metadata
        }
      };

      // Get existing sessions
      const existingSessions = await this.storageManager.get(this.STORAGE_KEYS.BREAK_SESSIONS) || [];
      
      // Add new session
      existingSessions.push(session);
      
      // Save updated sessions
      await this.storageManager.set(this.STORAGE_KEYS.BREAK_SESSIONS, existingSessions);
      
      // Update aggregated statistics
      await this.updateAggregatedStats(session);
      
      console.log("Break session recorded:", session.id, session.type, session.actualDuration + "min");
      return session.id;
    } catch (error) {
      console.error("Error recording break session:", error);
      return null;
    }
  }

  /**
   * Update aggregated statistics for daily, weekly, and monthly data
   */
  async updateAggregatedStats(session) {
    try {
      const date = new Date(session.startTime);
      const dateStr = session.date;
      const weekStr = this.getWeekString(date);
      const monthStr = this.getMonthString(date);

      // Update daily stats
      await this.updateDailyStats(dateStr, session);
      
      // Update weekly stats
      await this.updateWeeklyStats(weekStr, session);
      
      // Update monthly stats
      await this.updateMonthlyStats(monthStr, session);
      
    } catch (error) {
      console.error("Error updating aggregated stats:", error);
    }
  }

  /**
   * Update daily statistics
   */
  async updateDailyStats(dateStr, session) {
    try {
      const dailyStats = await this.storageManager.get(this.STORAGE_KEYS.DAILY_STATS) || {};
      
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = {
          date: dateStr,
          totalBreaks: 0,
          totalBreakTime: 0,
          breaksByType: { short: 0, medium: 0, long: 0 },
          breaksByHour: Array(24).fill(0),
          completedBreaks: 0,
          averageDuration: 0
        };
      }
      
      const dayStats = dailyStats[dateStr];
      dayStats.totalBreaks++;
      dayStats.totalBreakTime += session.actualDuration;
      dayStats.breaksByType[session.type] = (dayStats.breaksByType[session.type] || 0) + 1;
      dayStats.breaksByHour[session.hour]++;
      
      if (session.completed) {
        dayStats.completedBreaks++;
      }
      
      dayStats.averageDuration = Math.round(dayStats.totalBreakTime / dayStats.totalBreaks);
      
      await this.storageManager.set(this.STORAGE_KEYS.DAILY_STATS, dailyStats);
    } catch (error) {
      console.error("Error updating daily stats:", error);
    }
  }

  /**
   * Update weekly statistics
   */
  async updateWeeklyStats(weekStr, session) {
    try {
      const weeklyStats = await this.storageManager.get(this.STORAGE_KEYS.WEEKLY_STATS) || {};
      
      if (!weeklyStats[weekStr]) {
        weeklyStats[weekStr] = {
          week: weekStr,
          totalBreaks: 0,
          totalBreakTime: 0,
          breaksByType: { short: 0, medium: 0, long: 0 },
          breaksByDay: Array(7).fill(0),
          completedBreaks: 0,
          averageDuration: 0
        };
      }
      
      const weekStats = weeklyStats[weekStr];
      weekStats.totalBreaks++;
      weekStats.totalBreakTime += session.actualDuration;
      weekStats.breaksByType[session.type] = (weekStats.breaksByType[session.type] || 0) + 1;
      weekStats.breaksByDay[session.dayOfWeek]++;
      
      if (session.completed) {
        weekStats.completedBreaks++;
      }
      
      weekStats.averageDuration = Math.round(weekStats.totalBreakTime / weekStats.totalBreaks);
      
      await this.storageManager.set(this.STORAGE_KEYS.WEEKLY_STATS, weeklyStats);
    } catch (error) {
      console.error("Error updating weekly stats:", error);
    }
  }

  /**
   * Update monthly statistics
   */
  async updateMonthlyStats(monthStr, session) {
    try {
      const monthlyStats = await this.storageManager.get(this.STORAGE_KEYS.MONTHLY_STATS) || {};
      
      if (!monthlyStats[monthStr]) {
        monthlyStats[monthStr] = {
          month: monthStr,
          totalBreaks: 0,
          totalBreakTime: 0,
          breaksByType: { short: 0, medium: 0, long: 0 },
          completedBreaks: 0,
          averageDuration: 0,
          daysWithBreaks: new Set()
        };
      }
      
      const monthStats = monthlyStats[monthStr];
      monthStats.totalBreaks++;
      monthStats.totalBreakTime += session.actualDuration;
      monthStats.breaksByType[session.type] = (monthStats.breaksByType[session.type] || 0) + 1;
      monthStats.daysWithBreaks.add(session.date);
      
      if (session.completed) {
        monthStats.completedBreaks++;
      }
      
      monthStats.averageDuration = Math.round(monthStats.totalBreakTime / monthStats.totalBreaks);
      
      // Convert Set to Array for storage
      monthStats.daysWithBreaksCount = monthStats.daysWithBreaks.size;
      delete monthStats.daysWithBreaks;
      
      await this.storageManager.set(this.STORAGE_KEYS.MONTHLY_STATS, monthlyStats);
    } catch (error) {
      console.error("Error updating monthly stats:", error);
    }
  }

  /**
   * Get daily statistics for a specific date or date range
   */
  async getDailyStats(startDate, endDate = null) {
    try {
      const dailyStats = await this.storageManager.get(this.STORAGE_KEYS.DAILY_STATS) || {};
      
      if (!endDate) {
        // Single date
        const dateStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
        return dailyStats[dateStr] || this.getEmptyDayStats(dateStr);
      }
      
      // Date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const result = {};
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        result[dateStr] = dailyStats[dateStr] || this.getEmptyDayStats(dateStr);
      }
      
      return result;
    } catch (error) {
      console.error("Error getting daily stats:", error);
      return {};
    }
  }

  /**
   * Get weekly statistics
   */
  async getWeeklyStats(weekString = null) {
    try {
      const weeklyStats = await this.storageManager.get(this.STORAGE_KEYS.WEEKLY_STATS) || {};
      
      if (weekString) {
        return weeklyStats[weekString] || this.getEmptyWeekStats(weekString);
      }
      
      return weeklyStats;
    } catch (error) {
      console.error("Error getting weekly stats:", error);
      return {};
    }
  }

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(monthString = null) {
    try {
      const monthlyStats = await this.storageManager.get(this.STORAGE_KEYS.MONTHLY_STATS) || {};
      
      if (monthString) {
        return monthlyStats[monthString] || this.getEmptyMonthStats(monthString);
      }
      
      return monthlyStats;
    } catch (error) {
      console.error("Error getting monthly stats:", error);
      return {};
    }
  }

  /**
   * Get comprehensive analytics for today, this week, and this month
   */
  async getComprehensiveAnalytics() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisWeek = this.getWeekString(now);
      const thisMonth = this.getMonthString(now);

      const [todayStats, weekStats, monthStats] = await Promise.all([
        this.getDailyStats(today),
        this.getWeeklyStats(thisWeek),
        this.getMonthlyStats(thisMonth)
      ]);

      return {
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        summary: {
          todayBreaks: todayStats.totalBreaks || 0,
          weekBreaks: weekStats.totalBreaks || 0,
          monthBreaks: monthStats.totalBreaks || 0,
          todayBreakTime: todayStats.totalBreakTime || 0,
          weekBreakTime: weekStats.totalBreakTime || 0,
          monthBreakTime: monthStats.totalBreakTime || 0,
          mostCommonBreakType: this.getMostCommonBreakType(monthStats.breaksByType),
          averageBreakDuration: monthStats.averageDuration || 0
        }
      };
    } catch (error) {
      console.error("Error getting comprehensive analytics:", error);
      return null;
    }
  }

  /**
   * Get break patterns and insights
   */
  async getBreakPatterns() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Get sessions from last 30 days
      const sessions = await this.getBreakSessions(thirtyDaysAgo, now);
      
      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          patterns: {},
          insights: ["Start taking breaks to see your patterns!"]
        };
      }

      const patterns = {
        peakBreakHours: this.calculatePeakBreakHours(sessions),
        preferredBreakTypes: this.calculateBreakTypePreferences(sessions),
        breakFrequencyByDay: this.calculateBreakFrequencyByDay(sessions),
        completionRate: this.calculateCompletionRate(sessions),
        averageWorkTimeBeforeBreak: this.calculateAverageWorkTime(sessions)
      };

      const insights = this.generateInsights(patterns, sessions);

      return {
        totalSessions: sessions.length,
        patterns,
        insights
      };
    } catch (error) {
      console.error("Error getting break patterns:", error);
      return null;
    }
  }

  /**
   * Get break sessions within a date range
   */
  async getBreakSessions(startDate, endDate) {
    try {
      const allSessions = await this.storageManager.get(this.STORAGE_KEYS.BREAK_SESSIONS) || [];
      
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      return allSessions.filter(session => 
        session.startTime >= start && session.startTime <= end
      );
    } catch (error) {
      console.error("Error getting break sessions:", error);
      return [];
    }
  }

  /**
   * Clean up old data to prevent storage bloat
   */
  async cleanupOldData() {
    try {
      const settings = await this.storageManager.get(this.STORAGE_KEYS.ANALYTICS_SETTINGS);
      const now = Date.now();
      
      // Check if cleanup is needed (once per day)
      if (settings && settings.lastCleanupDate && 
          (now - settings.lastCleanupDate) < (24 * 60 * 60 * 1000)) {
        return false;
      }

      let cleanedCount = 0;

      // Clean up old sessions
      const sessions = await this.storageManager.get(this.STORAGE_KEYS.BREAK_SESSIONS) || [];
      const retentionTime = now - (this.DATA_RETENTION.SESSIONS * 24 * 60 * 60 * 1000);
      const filteredSessions = sessions.filter(session => session.startTime > retentionTime);
      
      if (filteredSessions.length < sessions.length) {
        await this.storageManager.set(this.STORAGE_KEYS.BREAK_SESSIONS, filteredSessions);
        cleanedCount += sessions.length - filteredSessions.length;
      }

      // Clean up old daily stats
      const dailyStats = await this.storageManager.get(this.STORAGE_KEYS.DAILY_STATS) || {};
      const dailyRetentionDate = new Date(now - (this.DATA_RETENTION.DAILY_STATS * 24 * 60 * 60 * 1000));
      const filteredDailyStats = {};
      
      Object.keys(dailyStats).forEach(dateStr => {
        if (new Date(dateStr) > dailyRetentionDate) {
          filteredDailyStats[dateStr] = dailyStats[dateStr];
        }
      });
      
      if (Object.keys(filteredDailyStats).length < Object.keys(dailyStats).length) {
        await this.storageManager.set(this.STORAGE_KEYS.DAILY_STATS, filteredDailyStats);
      }

      // Update last cleanup date
      if (settings) {
        settings.lastCleanupDate = now;
        await this.storageManager.set(this.STORAGE_KEYS.ANALYTICS_SETTINGS, settings);
      }

      console.log(`Data cleanup completed. Removed ${cleanedCount} old sessions.`);
      return true;
    } catch (error) {
      console.error("Error during data cleanup:", error);
      return false;
    }
  }

  // Helper methods for calculations and formatting

  /**
   * Get week string in format YYYY-WW
   */
  getWeekString(date) {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get month string in format YYYY-MM
   */
  getMonthString(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  /**
   * Get week number of the year
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Get empty day stats template
   */
  getEmptyDayStats(dateStr) {
    return {
      date: dateStr,
      totalBreaks: 0,
      totalBreakTime: 0,
      breaksByType: { short: 0, medium: 0, long: 0 },
      breaksByHour: Array(24).fill(0),
      completedBreaks: 0,
      averageDuration: 0
    };
  }

  /**
   * Get empty week stats template
   */
  getEmptyWeekStats(weekStr) {
    return {
      week: weekStr,
      totalBreaks: 0,
      totalBreakTime: 0,
      breaksByType: { short: 0, medium: 0, long: 0 },
      breaksByDay: Array(7).fill(0),
      completedBreaks: 0,
      averageDuration: 0
    };
  }

  /**
   * Get empty month stats template
   */
  getEmptyMonthStats(monthStr) {
    return {
      month: monthStr,
      totalBreaks: 0,
      totalBreakTime: 0,
      breaksByType: { short: 0, medium: 0, long: 0 },
      completedBreaks: 0,
      averageDuration: 0,
      daysWithBreaksCount: 0
    };
  }

  /**
   * Get most common break type from break type counts
   */
  getMostCommonBreakType(breaksByType) {
    if (!breaksByType) return 'none';
    
    let maxCount = 0;
    let mostCommon = 'none';
    
    Object.entries(breaksByType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = type;
      }
    });
    
    return mostCommon;
  }

  /**
   * Calculate peak break hours from sessions
   */
  calculatePeakBreakHours(sessions) {
    const hourCounts = Array(24).fill(0);
    sessions.forEach(session => {
      hourCounts[session.hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    const peakHours = [];
    
    hourCounts.forEach((count, hour) => {
      if (count === maxCount && count > 0) {
        peakHours.push(hour);
      }
    });
    
    return peakHours;
  }

  /**
   * Calculate break type preferences
   */
  calculateBreakTypePreferences(sessions) {
    const typeCounts = { short: 0, medium: 0, long: 0 };
    sessions.forEach(session => {
      typeCounts[session.type] = (typeCounts[session.type] || 0) + 1;
    });
    
    const total = sessions.length;
    const preferences = {};
    
    Object.entries(typeCounts).forEach(([type, count]) => {
      preferences[type] = {
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });
    
    return preferences;
  }

  /**
   * Calculate break frequency by day of week
   */
  calculateBreakFrequencyByDay(sessions) {
    const dayCounts = Array(7).fill(0);
    sessions.forEach(session => {
      dayCounts[session.dayOfWeek]++;
    });
    
    return dayCounts;
  }

  /**
   * Calculate completion rate
   */
  calculateCompletionRate(sessions) {
    if (sessions.length === 0) return 0;
    
    const completedSessions = sessions.filter(session => session.completed).length;
    return Math.round((completedSessions / sessions.length) * 100);
  }

  /**
   * Calculate average work time before breaks
   */
  calculateAverageWorkTime(sessions) {
    const workTimes = sessions
      .filter(session => session.metadata && session.metadata.workTimeBeforeBreak > 0)
      .map(session => session.metadata.workTimeBeforeBreak);
    
    if (workTimes.length === 0) return 0;
    
    const totalWorkTime = workTimes.reduce((sum, time) => sum + time, 0);
    return Math.round(totalWorkTime / workTimes.length / (1000 * 60)); // Convert to minutes
  }

  /**
   * Generate insights based on patterns
   */
  generateInsights(patterns, sessions) {
    const insights = [];
    
    // Peak hours insight
    if (patterns.peakBreakHours.length > 0) {
      const hours = patterns.peakBreakHours.map(h => `${h}:00`).join(', ');
      insights.push(`You take most breaks around ${hours}`);
    }
    
    // Break type preference
    const preferences = patterns.preferredBreakTypes;
    const mostPreferred = Object.entries(preferences)
      .sort(([,a], [,b]) => b.count - a.count)[0];
    
    if (mostPreferred && mostPreferred[1].count > 0) {
      insights.push(`You prefer ${mostPreferred[0]} breaks (${mostPreferred[1].percentage}% of the time)`);
    }
    
    // Completion rate insight
    if (patterns.completionRate < 70) {
      insights.push("Consider shorter breaks to improve completion rate");
    } else if (patterns.completionRate > 90) {
      insights.push("Great job completing your breaks!");
    }
    
    // Work time insight
    if (patterns.averageWorkTimeBeforeBreak > 0) {
      if (patterns.averageWorkTimeBeforeBreak > 45) {
        insights.push("You tend to work longer than recommended before taking breaks");
      } else if (patterns.averageWorkTimeBeforeBreak < 20) {
        insights.push("You're taking breaks frequently - great for maintaining focus!");
      }
    }
    
    return insights;
  }
}

// Export for use in service worker and other contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = BreakAnalyticsTracker;
} else if (typeof self !== "undefined") {
  self.BreakAnalyticsTracker = BreakAnalyticsTracker;
}

// ES6 export for testing
export default BreakAnalyticsTracker;