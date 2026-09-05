import { Response, NextFunction } from 'express';
import { OpportunityService } from '../services/opportunity.service';
import { AuthenticatedRequest } from '../../auth/middlewares/auth.middleware';
import { CreateOpportunitySchema, UpdateOpportunitySchema } from '../validators/opportunity.validator';

const oppService = new OpportunityService();

export class OpportunityController {
  // 1. Create Opportunity (Publish Immediately)
  async createOpportunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateOpportunitySchema.parse(req.body);
      const opp = await oppService.createOpportunity(req.user!.id, req.user!.role, validated, true);

      res.status(201).json({
        success: true,
        message: 'Opportunity published successfully.',
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Save Draft Opportunity
  async saveDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateOpportunitySchema.parse(req.body);
      const opp = await oppService.createOpportunity(req.user!.id, req.user!.role, validated, false);

      res.status(201).json({
        success: true,
        message: 'Opportunity draft saved successfully.',
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Publish Opportunity (Draft -> Published)
  async publishOpportunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const opp = await oppService.publishOpportunity(req.user!.id, req.user!.role, id);

      res.status(200).json({
        success: true,
        message: 'Opportunity published successfully.',
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Update Opportunity
  async updateOpportunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = UpdateOpportunitySchema.parse(req.body);
      const opp = await oppService.updateOpportunity(req.user!.id, req.user!.role, id, validated);

      res.status(200).json({
        success: true,
        message: 'Opportunity updated successfully.',
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Archive Opportunity
  async archiveOpportunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const opp = await oppService.archiveOpportunity(req.user!.id, req.user!.role, id);

      res.status(200).json({
        success: true,
        message: 'Opportunity archived successfully.',
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Get Opportunity details
  async getOpportunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const opp = await oppService.getOpportunity(id, req.user?.id, req.user?.role);

      res.status(200).json({
        success: true,
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  // 7. Search & Filters Opportunities
  async searchOpportunities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await oppService.searchOpportunities(req.query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 8. Bookmark Opportunity
  async bookmarkOpportunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bookmark = await oppService.toggleBookmark(req.user!.id, id, 'ADD');

      res.status(201).json({
        success: true,
        message: 'Opportunity bookmarked successfully.',
        data: bookmark,
      });
    } catch (error) {
      next(error);
    }
  }

  // 9. Remove Bookmark
  async removeBookmark(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await oppService.toggleBookmark(req.user!.id, id, 'REMOVE');

      res.status(200).json({
        success: true,
        message: 'Bookmark removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  // 10. Get My Opportunities (Creator's list or Student bookmarks)
  async getMyOpportunities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await oppService.getMyOpportunities(req.user!.id, req.user!.role);

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error) {
      next(error);
    }
  }

  // 11. Get Recommended Opportunities for student
  async getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await oppService.getRecommendations(req.user!.id);

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error) {
      next(error);
    }
  }
}
