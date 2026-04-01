import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  data: any;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

type JobHandler = (job: Job, updateProgress: (progress: number) => void) => Promise<any>;

class JobQueueService {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();

  registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async addJob(type: string, data: any): Promise<Job> {
    const id = uuidv4();
    const job: Job = {
      id,
      type,
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, job);

    // Start processing asynchronously
    this.processJob(id).catch(console.error);

    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async processJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      job.updatedAt = new Date();
      return;
    }

    job.status = 'processing';
    job.updatedAt = new Date();

    const updateProgress = (progress: number) => {
      job.progress = progress;
      job.updatedAt = new Date();
    };

    try {
      const result = await handler(job, updateProgress);
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date();
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message || String(error);
      job.updatedAt = new Date();
    }
  }
}

export const JobQueue = new JobQueueService();
