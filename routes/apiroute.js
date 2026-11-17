import express from 'express';
import control from '../controllers/control.js';
//import uploadCtrl from '../controllers/uploadController.js';

const router = express.Router();

// an authenticated middware that is used by most request except speceific or general ecounter request
function ensureAuthenticated(req, res, next) {
  
  if (req.isAuthenticated()) {
    
    return next();
  }
  
  res.status(409).json({ message: "Unauthorized" });
}


/**
 * @swagger
 * /encounterOne:
 *   post:
 *     summary: User requests to view a specific encounter post
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
 *         description: ok
 */


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
 *     summary: Gets all the encounters posted by the authenticated user
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
router.post('/encounter', ensureAuthenticated, control.newEncounter);
/**
 * @swagger
 * /encounter:
 *   post:
 *     summary: Calls a merge for two encounters and creates a request to wait for consent. Both encounters must not be already a child.
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
 *     summary: looks for all current pending merges for this account
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
 *     summary: It confirms the merge request and if all consents have been given the merge will be commited.
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
 *     summary: Marks that a user has chose to reject a merge request
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
 *     summary: unmerges an merged encounter child away from his current parent encounter 
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
 *     summary: remove an encounter, but the encounter must have no depent merged child
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