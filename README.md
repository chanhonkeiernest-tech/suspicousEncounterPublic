# Description 
This is a backend for the application or web service suspicious encounter. It has a login feature and user can interact with it. 

## keywords
Parent encounter post or parent: The post that has at least one post merge to it.
Merged child or child: encounter post that are current merge to a post

# Features
## Server
Main listening point
Pass all request to the route
Establish connection database
Configure express such as cookie or cros 

## Apiroute
Take all request and route to control
This is where swagger live
## login/ passport
A route for login and also controls passport
## Control
Process all request for the application
Also edits database
Uses helping method for Util
Uses information from login/ passport to authenticate user
You can view them all in swagger documentation: https://suspicousencounterpublic.onrender.com/api-docs/
### List of request call: 
- newuser: Register a new user (post)
- user: login a user (post)
- logout: logout a user (get)
- encounterOne: User requests to view a specific encounter post (post)
- checksession: Checks whether the current session is authenticated (get)
- encounter: Gets all the posted encounter. Query is allowed. (get)
- myEncounter: Gets all the encounters posted by the authenticated user (get)
- encounter: Creates new encounter (post)
- encounterMerge: Calls a merge for two encounters and creates a request to wait for consent. Both encounters must not be already a child. (post)
- merge: Looks for all current pending merges for this account (post)
- encounterMerging: It confirms the merge request and if all consents have been given the merge will be commited.(post)
- encounterMerge/reject: Marks that a user has chose to reject a merge request. (post)
- merge: unmerges an merged encounter child away from his current parent encounter (delete)
- otherEncounter/:eid: gets all the encounters that is merged to this encounter (get)
- encounter: remove an encounter, but the encounter must have no depent merged child (delete)

## Database
Mongoose database more information in data section
## Util
Helping function to help process request


