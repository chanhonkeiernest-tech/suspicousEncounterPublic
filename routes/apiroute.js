import express from 'express';
import control from '../controllers/control.js';
//import uploadCtrl from '../controllers/uploadController.js';

const router = express.Router();

// all the route for adding, editing, renaming and removing note with addion of authenticate middware.
function ensureAuthenticated(req, res, next) {
  
  if (req.isAuthenticated()) {
    
    return next();
  }
  
  res.status(409).json({ message: "Unauthorized" });
}

router.post('/encounterOne',control.oneEncounter);

/**
 * @swagger
 * /checksession:
 *   get:
 *     summary: Checks whether the current session is authenticated
 *     tags:
 *       - Account
 *     responses:
 *       200:
 *         description: Current authentication state
 */
router.get('/checksession', control.checksession);

/**
 * @swagger
 * /encounter:
 *   get:
 *     summary: Gets all the posted encounter
 *     tags:
 *       - encounter
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [uncertain, certain]
 *         description: Filter encounters by type
 *       - in: query
 *         name: issue
 *         schema:
 *           type: string
 *           enum: [AI-slop, scam, advertisement]
 *         description: Filter encounters by issue
 *     responses:
 *       200:
 *         description: Showing a bunch of posted encounters
 */
router.get('/encounter',control.allEncounter);

/**
 * @swagger
 * /myEncounter:
 *   get:
 *     summary: Gets encounters posted by the authenticated user
 *     tags:
 *       - encounter
 *     security:
 *       - Passport: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [uncertain, certain]
 *         description: Filter the current user's encounters by type
 *       - in: query
 *         name: issue
 *         schema:
 *           type: string
 *           enum: [AI-slop, scam, advertisement]
 *         description: Filter the current user's encounters by issue
 *     responses:
 *       200:
 *         description: Encounters posted by the current user
 *       409:
 *         description: Unauthorized
 */
router.get('/myEncounter', ensureAuthenticated, control.myEncounter);

/**
 * @swagger
 * /encounter:
 *   post:
 *     summary: Creates new encounter
 *     tags:
 *       - encounter
 *     security:
 *       - Passport: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/newEncounter'
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/encounter', ensureAuthenticated,control.newEncounter);

router.post('/encounterMerge', ensureAuthenticated,control.mergeEncounter);

router.get('/merge', ensureAuthenticated,control.pendingmerges);

router.post('/encounterMerging', ensureAuthenticated,control.mergingEncounter);

router.post('/encounterMerge/reject', ensureAuthenticated, control.rejectMerge);

router.delete('/merge', ensureAuthenticated,control.unmerge);

router.get('/otherEncounter/:eid',control.relatedEncounter);


// Delete an encounter (expects body: { id })
router.delete('/encounter', ensureAuthenticated, control.deleteEncounter);

//router.put('ecounter')
/**
 * Upload image
 */
//router.post('/upload', ensureAuthenticated, uploadCtrl.uploadImage);
//router.get('*',ensureAuthenticated, control.any);

export default router; 