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
 *       201:
 *         description: OK
 */
router.post('/encounterMerge', ensureAuthenticated,control.newEncounter);
/**
 * @swagger
 * /encounter:
 *   post:
 *     summary: Call a merge for two encounter
 *     tags:
 *       - encounter
 *     security:
 *       - Passport: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/mergeEncounter'
 *     responses:
 *       201:
 *         description: wait for approve
 */
router.post('/encounterMerge', ensureAuthenticated,control.mergeEncounter);
/**
 * @swagger
 * /merge:
 *   get:
 *     summary: check the current pending merge for this account
 *     tags:
 *       - merge
 *     security:
 *       - Passport: []
 *     responses:
 *       200:
 *         description: get list of pending merge
 */
router.get('/merge', ensureAuthenticated,control.pendingmerges);
/**
 * @swagger
 * /encounterMerging:
 *   post:
 *     summary: confirm a merge
 *     tags:
 *       - merge
 *     security:
 *       - Passport: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/mergingEncounter'
 *     responses:
 *       201:
 *         description: merge confirm
 */
router.post('/encounterMerging', ensureAuthenticated,control.mergingEncounter);
/**
 * @swagger
 * /encounterMerging/reject:
 *   post:
 *     summary: reject a merge
 *     tags:
 *       - merge
 *     security:
 *       - Passport: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/mergingEncounter'
 *     responses:
 *       201:
 *         description: merge reject
 */
router.post('/encounterMerge/reject', ensureAuthenticated, control.rejectMerge);
/**
 * @swagger
 * /merge:
 *   delete:
 *     summary: unmerge an encounter chain
 *     tags:
 *       - encounter
 *     security:
 *       - Passport: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/mergingEncounter'
 *     responses:
 *       201:
 *         description: unmerged
 */
router.delete('/merge', ensureAuthenticated,control.unmerge);
/**
 * @swagger
 * /merge:
 *   get:
 *     summary: gets all the encounters that is merged to this encounter
 *     tags:
 *       - encounter
 *     security:
 *       - Passport: []
 *     responses:
 *       200:
 *         description: get list of related
 */
router.get('/otherEncounter/:eid',control.relatedEncounter);


/**
 * @swagger
 * /encounter:
 *   delete:
 *     summary: remove an encounter
 *     tags:
 *       - encounter
 *     security:
 *       - Passport: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/mergingEncounter'
 *     responses:
 *       201:
 *         description: deleted
 */
router.delete('/encounter', ensureAuthenticated, control.deleteEncounter);

//router.put('ecounter')
/**
 * Upload image
 */
//router.post('/upload', ensureAuthenticated, uploadCtrl.uploadImage);
//router.get('*',ensureAuthenticated, control.any);

export default router; 