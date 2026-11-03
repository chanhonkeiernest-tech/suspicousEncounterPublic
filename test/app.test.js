import { use, expect } from "chai";
import chaiHttp from "chai-http";
import app from "../server.js";
import Account from "../model/accountdb.js";
import Encounter from "../model/encounter.js";
import control from "../controllers/control.js";
import merge from "../model/merge.js";

// Test-only mock auth: if Authorization header is present, mark request as authenticated
// and provide a minimal `req.user`. This avoids modifying application code.
// Keep tests isolated: do not rely on global test middleware here.
// We'll use a chai agent to perform a real login and reuse its session cookie.

// Mocha is the test runner. It discovers test files, groups them with describe(),
// and executes each test case with it().
// Chai provides readable assertions such as expect(...).to.have.status(200).
// chai-http extends Chai so we can send HTTP requests to the Express app.
const chai = use(chaiHttp); // chai-http is a plugin for chai, we are configuring it here so that chai can use its own plugin ;

/* describe('statement that describes the test suite', (cb) = {
    it('statement for individual test' , (cb) => {
      // body of the test 
      });
     it('statement of 2nd test', (cb) => {
      }); 
      it('statement of 3nd test', (cb) => {
      }); 
});

*/

describe("Express App Tests", () => {
  // A mock object is a dependency for real data during testing.
  // It allows us to simulate authentication without depending on a real token service.
  const mockAuth = {
    type: "Bearer",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYWRtaW4ifQ.signature",
  };

  const authHeader = `${mockAuth.type} ${mockAuth.token}`;

  let agent;
  let agent2;
  
  let createdEncounterId = null; //created by agent
  let createdEncounterId2 = null; //created by agent
  let createdEncounterId3 = null; //created by agent2
  let createdEncounterIdD =null;
  let createdMerge = null; //between ID1 and 2
  let createdMerge2 = null; //between ID1 and 3
  let createdMergeD = null;
  let totalEncounter = 0;
  before(async () => {
    // ensure no leftover user
    await Account.deleteOne({ username: 'test-user' });
    await Account.deleteOne({ username: 'test-user2' });
    const oldEncounters = await Encounter.find({
      topic: 'Win price from xgame',
      description: { $in: [
        'Came across an email about winning price from a game company called xgame.',
        'Came across an email about winning price from  xgame.',
        'There is an email about winning price from  xgame.'
      ] }
    }).select('_id').lean();
    const oldEncounterIds = oldEncounters.map(({ _id }) => _id);
    await merge.deleteMany({
      $or: [
        { encounterOrgin: { $in: oldEncounterIds } },
        { encounterToBeMerged: { $in: oldEncounterIds } }
      ]
    });
    await Encounter.deleteMany({ _id: { $in: oldEncounterIds } });
    const hashed = await Account.hashing('testpass');
    const hashed2 = await Account.hashing('testpass');
    await new Account({ username: 'test-user', password: hashed }).save();
    await new Account({ username: 'test-user2', password: hashed2 }).save();

    // create an agent and login to establish session cookie
    agent = chai.request.agent(app);
    await agent.post('/login/user').send({ username: 'test-user', password: 'testpass' });

    agent2 = chai.request.agent(app);
    await agent2.post('/login/user').send({ username: 'test-user2', password: 'testpass' });

    // Replace the app's POST /encounter route handler with a test-safe handler.
    // Find the layer for POST /encounter and replace the final handler.
    
  });
  

  describe("GET /checksession", () => {
    it("should report an unauthenticated session", async () => {
      const res = await chai.request.execute(app).get("/checksession");

      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ authenticated: false, user: null });
    });

    it("should report the authenticated user", async () => {
      const res = await agent.get("/checksession");

      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        authenticated: true,
        user: { username: "test-user" }
      });
    });
  });

  
  describe("POST /encounter", () => {
    it("should return 401 if no auth token is provided", (done) => {
      chai.request
        .execute(app)
        .post("/encounter")
        
        .send({ topic: "Win price from xgame", description: "Came across an email about winning price from a game company called xgame.", tagString :"email, price", imgString : "" })
        .end((err, res) => {
          expect(res).to.have.status(409);
          expect(res.body).to.have.property("message", "Unauthorized");
          done();
        });
    });

    it("should create an encounter 1", async () => {
      const payload = { topic: 'Win price from xgame', description: 'Came across an email about winning price from a game company called xgame.', tagString: 'email, price', imgString: '', type: 'certain', issue: 'scam' };
      const res = await agent.post('/encounter').send(payload);
      if (res && res.status !== 201) console.log('POST /encounter response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'created');

      // Find the created document and remember its id for cleanup
      const created = await Encounter.findOne({ topic: payload.topic, description: payload.description }).sort({ _id: -1 }).lean();
      if (created && created._id) createdEncounterId = created._id;
      expect(created.type).to.equal('certain');
      expect(created.issue).to.equal('scam');
    });
    
    it("should create an encounter 2", async () => {
      const payload = { topic: 'Win price from xgame', description: 'Came across an email about winning price from  xgame.', tagString: 'email, price', imgString: '', type: 'uncertain', issue: 'AI-slop' };
      const res = await agent.post('/encounter').send(payload);
      if (res && res.status !== 201) console.log('POST /encounter response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'created');

      // Find the created document and remember its id for cleanup
      const created = await Encounter.findOne({ topic: payload.topic, description: payload.description }).sort({ _id: -1 }).lean();
      if (created && created._id) createdEncounterId2 = created._id;
      expect(created.type).to.equal('uncertain');
      expect(created.issue).to.equal('AI-slop');
    });

    it("should create an encounter 3", async () => {
      const payload = { topic: 'Win price from xgame', description: 'There is an email about winning price from  xgame.', tagString: 'email, game', imgString: '', type: 'uncertain', issue: 'advertisement' };
      const res = await agent2.post('/encounter').send(payload);
      if (res && res.status !== 201) console.log('POST /encounter response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'created');

      // Find the created document and remember its id for cleanup
      const created = await Encounter.findOne({ topic: payload.topic, description: payload.description }).sort({ _id: -1 }).lean();
      if (created && created._id) createdEncounterId3 = created._id;
    });

     it("should create an encounter D", async () => {
      const payload = { topic: 'Win price from xgame', description: 'There is an what.', tagString: 'email, game', imgString: '', type: 'uncertain', issue: 'AI-slop' };
      const res = await agent2.post('/encounter').send(payload);
      if (res && res.status !== 201) console.log('POST /encounter response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'created');

      // Find the created document and remember its id for cleanup
      const created = await Encounter.findOne({ topic: payload.topic, description: payload.description }).sort({ _id: -1 }).lean();
      if (created && created._id) createdEncounterIdD = created._id;
    });

  });

  

  describe("GET /encounter", () => {
    // it() defines one individual test case with a clear expected behavior.
    it("should return a list of encounter", (done) => {
      chai.request
        .execute(app)
        .get('/encounter')
        .end((err, res) => {
          totalEncounter=res.body.length;
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.greaterThan(1);
          done();
        });
    });

    it("should search encounters by name", async () => {
      const res = await chai.request.execute(app).get('/encounter?name=WIN%20PRICE');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body.every(({ topic }) => /win price/i.test(topic))).to.equal(true);
      expect(res.body.some(({ _id }) => _id === String(createdEncounterId))).to.equal(true);
    });

    it("should search encounters by tag", async () => {
      const res = await chai.request.execute(app).get('/encounter?tag=GAME');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body.every(({ tag }) => tag.some((value) => /game/i.test(value)))).to.equal(true);
      expect(res.body.some(({ _id }) => _id === String(createdEncounterId3))).to.equal(true);
    });

    it("should filter encounters by type and issue", async () => {
      const res = await chai.request.execute(app).get('/encounter?type=certain&issue=scam');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body.every(({ type, issue }) => type === 'certain' && issue === 'scam')).to.equal(true);
      expect(res.body.some(({ _id }) => _id === String(createdEncounterId))).to.equal(true);
    });
  });

  describe("GET /myEncounter", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await chai.request.execute(app).get('/myEncounter');

      expect(res).to.have.status(409);
      expect(res.body).to.have.property('message', 'Unauthorized');
    });

    it("should return only encounters posted by the authenticated user", async () => {
      const res = await agent.get('/myEncounter');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body.every(({ _id }) =>
        [String(createdEncounterId), String(createdEncounterId2)].includes(_id)
      )).to.equal(true);
      expect(res.body.some(({ _id }) => _id === String(createdEncounterId3))).to.equal(false);
    });

    it("should apply the existing name and tag filters to the user's encounters", async () => {
      const res = await agent.get('/myEncounter?name=WIN%20PRICE&tag=PRICE');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body.every(({ topic, tag }) =>
        /win price/i.test(topic) && tag.some((value) => /price/i.test(value))
      )).to.equal(true);
    });

    it("should filter the user's encounters by type and issue", async () => {
      const res = await agent.get('/myEncounter?type=certain&issue=scam');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body.every(({ type, issue }) => type === 'certain' && issue === 'scam')).to.equal(true);
      expect(res.body.some(({ _id }) => _id === String(createdEncounterId))).to.equal(true);
    });
  });





   describe("POST /encounterMerge", () => {
   
    it(" merge the D to 2", async () => {
      const payload = { idOrgin: createdEncounterId2, idToBeMerged: createdEncounterIdD};
      const res = await agent.post('/encounterMerge').send(payload);
      if (res && res.status !== 201) console.log('POST /encounterMerge response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'wait for approve');

      // Find the created document and remember its id for cleanup
      const created = await merge.findOne({
        encounterOrgin: payload.idOrgin,
        encounterToBeMerged: payload.idToBeMerged
      }).sort({ _id: -1 }).lean();
      if (created && created._id) createdMergeD = created._id;
    });

    it("should mark a pending merge rejected by the current participant without deleting it", async () => {
      const res = await agent2.post('/encounterMerge/reject').send({ id: createdMergeD });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('status', 'rejected');

      const storedMerge = await merge.findById(createdMergeD).lean();
      expect(storedMerge).to.not.equal(null);
      expect(storedMerge).to.not.have.property('rejectedBy');
      const rejectingUser = await Account.findOne({ username: 'test-user2' }).lean();
      expect(rejectingUser.rejectedMerges.map(String)).to.include(String(createdMergeD));

      const merges = await agent2.get('/merge');
      expect(merges).to.have.status(200);
      expect(merges.body.mergeP.map(({ _id }) => _id)).to.not.include(String(createdMergeD));
      expect(merges.body.mergeR.map(({ _id }) => _id)).to.include(String(createdMergeD));
    });

    it("should allow the rejecting user to approve the request later", async () => {
      await merge.updateOne({ _id: createdMergeD }, { $set: { confirmedBy: [] } });
      const res = await agent2.post('/encounterMerging').send({ id: createdMergeD });

      expect(res).to.have.status(202);
      expect(res.body).to.have.property('status', 'waiting for other user approval');
    });

    it("should commit an existing pending merge when an owner requests it again", async () => {
      const user1 = await Account.findOne({ username: 'test-user' });
      const user2 = await Account.findOne({ username: 'test-user2' });
      const destination = await new Encounter({
        topic: 'Duplicate merge destination',
        description: 'Temporary destination for duplicate merge test',
        user: user1._id,
        tag: [],
        img: [],
        origin: true
      }).save();
      const source = await new Encounter({
        topic: 'Duplicate merge source',
        description: 'Temporary source for duplicate merge test',
        user: user2._id,
        tag: [],
        img: [],
        origin: true
      }).save();
      const pendingRequest = await new merge({
        encounterOrgin: destination._id,
        encounterToBeMerged: source._id,
        user1: user1._id,
        user2: user2._id,
        userprompted: user2._id,
        confirmedBy: [user2._id]
      }).save();

      try {
        await Account.updateOne(
          { _id: user1._id },
          { $addToSet: { rejectedMerges: pendingRequest._id } }
        );
        const res = await agent.post('/encounterMerge').send({
          idOrgin: source._id,
          idToBeMerged: destination._id
        });
        expect(res).to.have.status(201);
        expect(res.body).to.have.property('status', 'merged');

        const updatedSource = await Encounter.findById(source._id);
        expect(updatedSource.origin).to.equal(false);
        const updatedUser = await Account.findById(user1._id).lean();
        expect(updatedUser.rejectedMerges.map(String)).to.not.include(String(pendingRequest._id));
        expect(await merge.countDocuments({
          $or: [
            { encounterOrgin: source._id },
            { encounterToBeMerged: source._id }
          ]
        })).to.equal(0);
      } finally {
        await Account.updateMany(
          { rejectedMerges: pendingRequest._id },
          { $pull: { rejectedMerges: pendingRequest._id } }
        );
        await merge.deleteOne({ _id: pendingRequest._id });
        await Encounter.deleteMany({ _id: { $in: [destination._id, source._id] } });
      }
    });
    
    it("should start a merge", async () => {
      const payload = { idOrgin: createdEncounterId, idToBeMerged: createdEncounterId2};
      const res = await agent.post('/encounterMerge').send(payload);
      if (res && res.status !== 201) console.log('POST /encounterMerge response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'merged');

      const pendingMerge = await merge.findOne({
        encounterOrgin: payload.idOrgin,
        encounterToBeMerged: payload.idToBeMerged
      }).lean();
      expect(pendingMerge).to.equal(null);
    });

    

  });




  describe("GET /merge", () => {
    // it() defines one individual test case with a clear expected behavior.
    it("no merge becase agent merge to own", (done) => {
      chai.request
        .execute(app)
        agent2.get('/merge')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal({ mergeP: [], mergeR: [] });
          done();
        });
    });
  });


  describe("POST /encounterMerge", () => {
    it("should start a merge for encounter 3 with encounter 1", async () => {
      const payload = { idOrgin: createdEncounterId, idToBeMerged: createdEncounterId3 };
      const res = await agent.post('/encounterMerge').send(payload);
      if (res && res.status !== 201) console.log('POST /encounterMerge response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'wait for approve');

      const created = await merge.findOne({
        encounterOrgin: payload.idOrgin,
        encounterToBeMerged: payload.idToBeMerged
      }).sort({ _id: -1 }).lean();
      if (created && created._id) createdMerge2 = created._id;
    });
  });

  describe("POST /encounterMerging", () => {
    it("agent2 approve the merges so it should merge", async () => {
      const payload = { id: createdMerge2 };
      const res = await agent2.post('/encounterMerging').send(payload);
      if (res && res.status !== 201) console.log('POST /encounterMerging response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('status', 'merged');
    });
  });

  describe("GET /merge", () => {
    // it() defines one individual test case with a clear expected behavior.
    it("no more pending merge", (done) => {
      chai.request
        .execute(app)
        agent2.get('/merge')
        .end((err, res) => {
          expect(res.body).to.have.property('mergeP').that.is.an('array').that.is.empty;
          expect(res.body).to.have.property('mergeR').that.is.an('array').that.is.empty;
          done();
        });
    });
  });

describe("GET /encounter", () => {
    // it() defines one individual test case with a clear expected behavior.
    it("There should be one less encounter now", (done) => {
      chai.request
        .execute(app)
        .get('/encounter')
        .end((err, res) => {
          
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(totalEncounter-2);
          expect(res.body[0].tag).to.deep.equal([ 'email', 'price', 'game' ]);
          expect(res.body[0].related.map(({ _id }) => _id)).to.deep.equal([
            createdEncounterId2.toHexString(),
            createdEncounterId3.toHexString()
          ]);
          //console.log(res.body[0]);
          
          done();
        });
    });
  });


  describe("DELETE /merge", () => {
    it("should not be able to unmerge others encounter", async () => {
      const payload = { id: createdEncounterId2};
      const res = await agent2.delete('/merge').send(payload);
      if (res && res.status !== 201) console.log('DELETE /merge response:', res.status, res.body);
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('error', 'Encounter not found or this encounter does not belong to you');
    });

    it("should not be able to unmerge a origin encounter (with three)", async () => {
      const payload = { id: createdEncounterId};
      const res = await agent.delete('/merge').send(payload);
      if (res && res.status !== 201) console.log('DELETE /merge response:', res.status, res.body);
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('error', 'Encounter not found or this encounter does not belong to you');
    });

    it("should umerge encounter 2", async () => {
      const payload = { id: createdEncounterId2};
      const res = await agent.delete('/merge').send(payload);
      if (res && res.status !== 201) console.log('DELETE /merge response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('message', 'demerged');
    });
  });

  describe("GET /encounter", () => {
    // it() defines one individual test case with a clear expected behavior.
    it("There should be 2 unmerge encounter", (done) => {
      chai.request
        .execute(app)
        .get('/encounter')
        .end((err, res) => {
          
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(totalEncounter-1);
          if(totalEncounter-1===2){
            expect(res.body[0].tag).to.deep.equal([ 'email', 'price', 'game' ]);
            expect(res.body[0].related).to.deep.equal([  createdEncounterId3.toHexString() ]);
          }
          
          //console.log(res.body[0]);
          
          done();
        });
    });
  });

  describe("DELETE /merge", () => {
    it("should not be able to unmerge non merged encounter", async () => {
      const payload = { id: createdEncounterId2};
      const res = await agent.delete('/merge').send(payload);
      if (res && res.status !== 201) console.log('DELETE /merge response:', res.status, res.body);
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('error', 'Encounter not found or this encounter does not belong to you');
    });

    it("should not be able to unmerge a origin encounter (with two)", async () => {
      const payload = { id: createdEncounterId};
      const res = await agent.delete('/merge').send(payload);
      if (res && res.status !== 201) console.log('DELETE /merge response:', res.status, res.body);
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('error', 'Encounter not found or this encounter does not belong to you');
    });

    it("should umerge encounter 3", async () => {
      const payload = { id: createdEncounterId3};
      const res = await agent2.delete('/merge').send(payload);
      if (res && res.status !== 201) console.log('DELETE /merge response:', res.status, res.body);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('message', 'demerged');
    });


    
  });
  describe("GET /encounter", () => {
    // it() defines one individual test case with a clear expected behavior.
    it("All three encounter are unmerged", (done) => {
      chai.request
        .execute(app)
        .get('/encounter')
        .end((err, res) => {
          
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(totalEncounter);
          if(totalEncounter===3){
            expect(res.body[0].tag).to.deep.equal([ 'email', 'price', 'game' ]);
            expect(res.body[0].related).to.deep.equal([]);
          }
          
          //console.log(res.body[0]);
          
          done();
        });
    });
  });

  describe("POST /encounterMerging", () => {
    it("should reparent related encounters to the destination origin", async () => {
      const user1 = await Account.findOne({ username: 'test-user' });
      const user2 = await Account.findOne({ username: 'test-user2' });
      const destination = await new Encounter({
        topic: 'Merge group destination',
        description: 'Destination for related group test',
        user: user1._id,
        tag: [],
        img: [],
        origin: true
      }).save();
      const source = await new Encounter({
        topic: 'Merge group source',
        description: 'Source for related group test',
        user: user2._id,
        tag: [],
        img: [],
        origin: true,
        contributedUser: [user2._id, user2._id]
      }).save();
      await Encounter.updateOne(
        { _id: destination._id },
        { $set: { contributedUser: [user1._id] } }
      );
      const child = await new Encounter({
        topic: 'Merge group child',
        description: 'Related member for merge group test',
        user: user2._id,
        tag: [],
        img: [],
        origin: false,
        related: [source._id]
      }).save();
      const mergeRequest = await new merge({
        encounterOrgin: destination._id,
        encounterToBeMerged: source._id,
        user1: user1._id,
        user2: user2._id,
        userprompted: user1._id,
        confirmedBy: [user1._id]
      }).save();

      try {
        await Encounter.updateOne({ _id: source._id }, { $set: { related: [child._id] } });

        const res = await agent2.post('/encounterMerging').send({ id: mergeRequest._id });

        expect(res).to.have.status(201);
        const updatedChild = await Encounter.findById(child._id).lean();
        expect(updatedChild.related.map(String)).to.deep.equal([String(destination._id)]);
        const updatedDestination = await Encounter.findById(destination._id).lean();
        expect(updatedDestination.contributedUser.map(String)).to.deep.equal([
          String(user1._id),
          String(user2._id)
        ]);
      } finally {
        await merge.deleteOne({ _id: mergeRequest._id });
        await Encounter.deleteMany({ _id: { $in: [destination._id, source._id, child._id] } });
      }
    });
  });
  
  after(async () => {
    if (agent) agent.close();
    await Account.deleteOne({ username: 'test-user' });
    // delete the encounter created during the test, if any
    if (createdEncounterId||createdEncounterId2||createdEncounterId3||createdEncounterIdD||createdMerge) {
      try {
        await Encounter.deleteOne({ _id: createdEncounterId });
        await Encounter.deleteOne({ _id: createdEncounterId2 });
        await Encounter.deleteOne({ _id: createdEncounterId3 });
        await Encounter.deleteOne({ _id: createdEncounterIdD });
        await merge.deleteMany({
          $or: [
            { encounterOrgin: { $in: [createdEncounterId, createdEncounterId2, createdEncounterId3] } },
            { encounterToBeMerged: { $in: [createdEncounterId, createdEncounterId2, createdEncounterId3] } }
          ]
        });
      } catch (e) {
        // log but don't fail cleanup
        console.error('failed to delete test encounter', e);
      }
    }
    // restore stubs
    if (global.__origEncounterSave) Encounter.prototype.save = global.__origEncounterSave;
    if (global.__origEncounterFind) Encounter.find = global.__origEncounterFind;
    // restore original route handler
    if (global.__origEncounterRouteStack && app._router && app._router.stack) {
      for (const layer of app._router.stack) {
        if (layer.route && layer.route.path === '/encounter' && layer.route.methods && layer.route.methods.post) {
          for (let i = 0; i < layer.route.stack.length; i++) {
            if (global.__origEncounterRouteStack[i]) layer.route.stack[i].handle = global.__origEncounterRouteStack[i];
          }
        }
      }
    }
  });
  
});
