// export all repos
import UserRepository from './userRepository.js';
import RoadmapRepository from './roadmapRepository.js';
import ContentRepository from './contentRepository.js';

// Create repository instances
const userRepository = new UserRepository();
const roadmapRepository = new RoadmapRepository();
const contentRepository = new ContentRepository();

// Export individual repositories
export {
  userRepository,
  roadmapRepository,
  contentRepository
};

// Export repository factory
export class RepositoryFactory {
  static getUserRepository() {
    return userRepository;
  }

  static getRoadmapRepository() {
    return roadmapRepository;
  }

  static getContentRepository() {
    return contentRepository;
  }

  static getAllRepositories() {
    return {
      userRepository,
      roadmapRepository,
      contentRepository
    };
  }

  // Health check for all repositories
  static async healthCheck() {
    try {
      const checks = await Promise.all([
        userRepository.count().then(() => ({ name: 'UserRepository', status: 'healthy' })).catch(err => ({ name: 'UserRepository', status: 'unhealthy', error: err.message })),
        roadmapRepository.count().then(() => ({ name: 'RoadmapRepository', status: 'healthy' })).catch(err => ({ name: 'RoadmapRepository', status: 'unhealthy', error: err.message })),
        contentRepository.count().then(() => ({ name: 'ContentRepository', status: 'healthy' })).catch(err => ({ name: 'ContentRepository', status: 'unhealthy', error: err.message }))
      ]);

      const allHealthy = checks.every(check => check.status === 'healthy');

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        repositories: checks,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Default export with all repositories
export default {
  userRepository,
  roadmapRepository,
  contentRepository,
  RepositoryFactory
};