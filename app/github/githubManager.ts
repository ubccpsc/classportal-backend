
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
var request = require('request');
var rp = require('request-promise-native');

import { Helper } from "../github/util";
import { link } from "fs";

let async = require('async');
let _ = require('lodash');

/**
 * Represents a complete team that has been formed and where all members
 * are already registered (so we have their Github ids).
 */
export interface GroupRepoDescription {
    team: number;           // team number (used internally by portal)
    members: string[];      // github usernames
    url?: string;           // github url (leave undefined if not set)
    projectName?: string;   // github project name
    teamName?: string;      // github team name
    teamIndex?: number;
}

export interface IndividualRepoDescription extends GroupRepoDescription {
    // this is terrible, but is just to make us feel better about ourselves.
    // don't do anything with this
}

export interface GroupCommit {
    repoName: string;
    sha: string;
}

export default class GitHubManager {

    // Use external config file so tokens are not stored in github
    private GITHUB_AUTH_TOKEN = config.github_auth_token;
    private GITHUB_USER_NAME = config.github_user_name;

    private ORG_NAME: string;

    private DELAY_SEC = 5 * 1000;

    constructor(orgName: string) {
        console.log(orgName);
        console.log(this.ORG_NAME);
        this.ORG_NAME = orgName;
    }


    /**
     * get group repo descriptions
     *
     * on success, returns callback with 1st arg: null, 2nd arg: GroupRepoDescription[]
     * on error, returns callback with 1st arg: error message, 2nd arg: null
     */
    public getGroupDescriptions(): Promise<GroupRepoDescription[]> {
        logger.info("GitHubManager::getGroupDescriptions(..) - start");
        var returnVal: GroupRepoDescription[] = [];
        var studentsFile: any;
        var teamsFile: any;

        return new Promise(function (fulfill, reject) {
            async.waterfall([
                function get_students_file(callback: any) {
                    logger.info("GitHubManager::getGroupDescriptions(..) - get_students_file");
                    Helper.readJSON("students.json", function (error: any, data: any) {
                        if (!error) {
                            studentsFile = data;
                            return callback(null);
                        } else {
                            return callback("error reading students.json");
                        }
                    });
                },
                function get_teams_file(callback: any) {
                    logger.info("GitHubManager::getGroupDescriptions(..) - get_teams_file");
                    Helper.readJSON("teams.json", function (error: any, data: any) {
                        if (!error) {
                            teamsFile = data;
                            return callback(null);
                        } else {
                            return callback("error reading teams.json");
                        }
                    });
                },
                function get_group_repo_descriptions(callback: any) {
                    logger.info("GitHubManager::getGroupDescriptions(..) - get_group_repo_descriptions");

                    // for each team entry, convert team sids to usernames, then add new GroupRepoDescription to returnVal
                    for (var i = 0; i < teamsFile.length; i++) {
                        logger.trace("GitHubManager::getGroupDescriptions(..) - teamId: " + teamsFile[i].id);

                        var sidArray: string[] = teamsFile[i].members;
                        var usernamesArray: string[] = [];

                        // convert each sid in the current team entry to a username
                        async.forEachOf(sidArray,
                            function convert_sid_to_username(sid: string, index: number, callback: any) {
                                logger.trace("GitHubManager::getGroupDescriptions(..) - sid: " + sid);
                                var studentIndex = _.findIndex(studentsFile, {"sid": sid});

                                if (studentIndex >= 0) {
                                    var username = studentsFile[studentIndex].username;
                                    logger.trace("GitHubManager::getGroupDescriptions(..) - username: " + username);

                                    // return error if any student does not yet have a github username
                                    if (!username) {
                                        return callback(new Error(sid + "'s github username is not set"));
                                    } else {
                                        usernamesArray[index] = username;
                                        return callback();
                                    }
                                } else {
                                    return callback(new Error("could not find sid in students.json"));
                                }
                            }, function add_new_group_repo_description(error: any) {
                                if (!error) {
                                    var newGroupRepoDescription: GroupRepoDescription = {
                                        team: teamsFile[i].id,
                                        members: usernamesArray,
                                        url: teamsFile[i].url
                                    };
                                    returnVal.push(newGroupRepoDescription);
                                } else {
                                    // return callback(error.message);
                                    // there was a problem, but this just means we won't add it to the group list
                                    logger.warn('Problem adding new repo description: ' + error.message);
                                    // return callback(null);
                                }
                            }
                        );
                    }
                    // next function 'end' won't execute until above for loop is finished runnning.
                    return callback(null);
                }
            ], function end(error: any) {
                if (!error) {
                    logger.info("GitHubManager::getGroupDescriptions(..) - success");
                    // return parentCallback(null, returnVal);
                    fulfill(returnVal);
                } else {
                    logger.info("GitHubManager::getGroupDescriptions(..) - error: " + error);
                    // return parentCallback(error, null);
                    reject(error);
                }
            });
        });
    }


    /**
     * get group repo descriptions
     *
     * on success, returns callback with 1st arg: null, 2nd arg: GroupRepoDescription[]
     * on error, returns callback with 1st arg: error message, 2nd arg: null
     */
    public getIndividualDescriptions(): Promise<GroupRepoDescription[]> {
        logger.info("GitHubManager::getIndividualDescriptions(..) - start");
        var returnVal: GroupRepoDescription[] = [];
        var studentsFile: any;
        var teamsFile: any;

        return new Promise(function (fulfill, reject) {
            async.waterfall([
                function get_students_file(callback: any) {
                    logger.info("GitHubManager::getIndividualDescriptions(..) - get_students_file");
                    Helper.readJSON("students.json", function (error: any, data: any) {
                        if (!error) {
                            studentsFile = data;
                            return callback(null);
                        } else {
                            return callback("error reading students.json");
                        }
                    });
                },
                function create_repo_descriptions(callback: any) {
                    logger.info("GitHubManager::getIndividualDescriptions(..) - get_group_repo_descriptions");

                    // for each team entry, convert team sids to usernames, then add new GroupRepoDescription to returnVal
                    for (var student of studentsFile) {
                        logger.trace("GitHubManager::getIndividualDescriptions(..) - studentId: " + student.csid + '; username: ' + student.username);
                        //logger.trace("GitHubManager::getIndividualDescriptions(..) - userName: " + studentsFile[i].username);
                        if (student.username.length > 0) {
                            // var sidArray: string[] = teamsFile[i].members;
                            var usernamesArray: string[] = [];
                            usernamesArray.push(student.username);
                            let url = '';
                            if (typeof student.url !== 'undefined' && student.url !== null) {
                                url = student.url;
                            }

                            var newGroupRepoDescription: GroupRepoDescription = {
                                team: student.username,
                                members: usernamesArray,
                                url: url
                            };
                            returnVal.push(newGroupRepoDescription);
                        }
                        //else {
                        // return callback(error.message);
                        // there was a problem, but this just means we won't add it to the group list
                        //  logger.warn('Problem adding new repo description');
                        // return callback(null);
                        // }
                    }
                    // next function 'end' won't execute until above for loop is finished runnning.
                    return callback(null);
                }
            ], function end(error: any) {
                if (!error) {
                    logger.info("GitHubManager::getIndividualDescriptions(..) - success");
                    // return parentCallback(null, returnVal);
                    fulfill(returnVal);
                } else {
                    logger.info("GitHubManager::getIndividualDescriptions(..) - error: " + error);
                    // return parentCallback(error, null);
                    reject(error);
                }
            });
        });
    }


    /**
     * Update team entry with new URL.
     *
     * @param teamId, url, callback
     * @returns callback(null) on success, callback("error") on error
     */
    public setGithubUrl(teamId: number, url: string): Promise<string> {
        logger.trace("AdminController::setGithubUrl| Updating team " + teamId + " with url: " + url);
        return new Promise(function (fulfill, reject) {
            Helper.updateEntry("teams.json", {'id': teamId}, {'url': url}, function (error: any) {
                if (!error) {
                    fulfill(url);
                } else {
                    reject('URL not assigned for: ' + url);
                }
            });
        });
    }

    /**
     * Update team entry with new URL.
     *
     * @param teamId, url, callback
     * @returns callback(null) on success, callback("error") on error
     */
    public setIndividualUrl(username: string, url: string): Promise<string> {
        logger.trace("AdminController::setIndividualUrl| Updating student " + username + " with url: " + url);
        return new Promise(function (fulfill, reject) {
            Helper.updateEntry("students.json", {'username': username}, {'url': url}, function (error: any) {
                if (!error) {
                    fulfill(url);
                } else {
                    reject('URL not assigned for: ' + url);
                }
            });
        });
    }

    /**
     * Creates a given repo and returns its url. Will fail if the repo already exists.
     *
     * @param repoName
     * @returns {Promise<{}>}
     */
    public createRepo(repoName: string): Promise<string> {
        let ctx = this;
        let url = '';
        logger.info("GitHubManager::createRepo( " + repoName + " ) - start");
        return new Promise(function (fulfill, reject) {
            var options = {
                method: 'POST',
                uri: 'https://api.github.com/orgs/' + ctx.ORG_NAME + '/repos',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                },
                body: {
                    name: repoName,
                    private: true,
                    has_issues: true,
                    has_wiki: false,
                    has_downloads: false,
                    auto_init: false
                },
                json: true
            };

            rp(options).then(function (body: any) {
                url = body.html_url;
                logger.info("GitHubManager::createRepo(..) - success; url: " + url + "; delaying 5 seconds (so target is ready for import)");

                return ctx.delay(ctx.DELAY_SEC);
            }).then(function () {
                logger.info("GitHubManager::provisionProject(..) - repo created: " + repoName);
                fulfill(url);
            }).catch(function (err: any) {
                logger.error("GitHubManager::createRepo(..) - ERROR: " + JSON.stringify(err));
                reject(err);
            });

        });
    }

    /**
     * Deletes a repo from the organization.
     *
     * @param repoName
     * @returns {Promise<{}>}
     */
    public deleteRepo(repoName: string): Promise<string> {
        let ctx = this;

        logger.info("GitHubManager::deleteRepo(..) - start");
        return new Promise(function (fulfill, reject) {

            var options = {
                method: 'DELETE',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName,
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                }
            };

            rp(options).then(function (body: any) {
                logger.info("GitHubManager::deleteRepo(..) - success; body: " + body);
                fulfill(body);
            }).catch(function (err: any) {
                logger.error("GitHubManager::deleteRepo(..) - ERROR: " + JSON.stringify(err));
                reject(err);
            });

        });
    }

    /**
     * Deletes a repo from the organization.
     *
     * @param repoName
     * @returns {Promise<{}>}
     */
    public deleteTeam(teamName: string): Promise<string> {
        let ctx = this;

        return new Promise(function (fulfill, reject) {
            let teamId = -1;
            ctx.listTeams().then(function (teamList: any) {
                logger.info("GitHubManager::deleteTeam(..) - all teams: " + JSON.stringify(teamList));
                for (var team of teamList) {
                    if (team.name === teamName) {
                        teamId = team.id;
                        logger.info("GitHubManager::deleteTeam(..) - matched team; id: " + teamId);
                    }
                }
                if (teamId < 0) {
                    //throw new Error('Could not find team called: ' + teamName);
                    reject("GitHubManager::deleteTeam(..) " + teamName + ' could not be found');
                }

                var options = {
                    method: 'DELETE',
                    uri: 'https://api.github.com/teams/' + teamId,
                    headers: {
                        'Authorization': ctx.GITHUB_AUTH_TOKEN,
                        'User-Agent': ctx.GITHUB_USER_NAME,
                        'Accept': 'application/json'
                    }
                };
                logger.info("GitHubManager::deleteTeam(..) - deleting team; id: " + teamId);

                rp(options).then(function (body: any) {
                    logger.info("GitHubManager::deleteTeam(..) - success; body: " + body);
                    fulfill(body);
                }).catch(function (err: any) {
                    logger.error("GitHubManager::deleteTeam(..) - ERROR: " + JSON.stringify(err));
                    reject(err);
                });

            }).catch(function (err: any) {
                logger.info("GitHubManager::addTeamToRepos(..) - ERROR: " + err);
                reject(err);
            });

            logger.info("GitHubManager::addTeamToRepos(..) - end");
        });
    }


    /**
     * Lists teams. Will fail if more than 100 teams are in the organization
     * (or Github starts to disallow forcing the per_page variable).
     *
     * The success callback will include the Github team objects.
     *
     * @returns {Promise<{}>}
     */
    public listTeams(): Promise<{}> {
        let ctx = this;

        logger.info("GitHubManager::listTeams(..) - start");
        return new Promise(function (fulfill, reject) {

            var options = {
                method: 'GET',
                uri: 'https://api.github.com/orgs/' + ctx.ORG_NAME + '/teams?per_page=100',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                },
                resolveWithFullResponse: true,
                json: true
            };

            rp(options).then(function (fullResponse: any) {

                var teamsRaw: any[] = [];

                var paginationPromises: any[] = [];

                if (typeof fullResponse.headers.link !== 'undefined') {
                    // let eMessage = "GitHubManager::listTeams(..) - WARN; pagination encountered, getting all users";

                    // first save the responses from the first page:
                    teamsRaw = fullResponse.body;

                    var lastPage: number = -1;

                    var linkText = fullResponse.headers.link;
                    var linkParts = linkText.split(',');

                    for (let p of linkParts) {
                        var pparts = p.split(';');
                        if (pparts[1].indexOf('last')) {
                            var pText = pparts[0].split('&page=')[1];
                            lastPage = pText.match(/\d+/)[0];
                            // logger.trace('last page: ' + lastPage);
                        }
                    }

                    let pageBase = '';
                    for (let p of linkParts) {
                        var pparts = p.split(';');
                        if (pparts[1].indexOf('next')) {
                            var pText = pparts[0].split('&page=')[0].trim();
                            // logger.trace('pt: ' + pText);
                            pText = pText.substring(1);
                            pText = pText + "&page=";
                            pageBase = pText;
                            // logger.trace('page base: ' + pageBase);
                        }
                    }

                    logger.trace("GitHubManager::listTeams(..) - handling pagination; #pages: " + lastPage);

                    for (var i = 2; i <= lastPage; i++) {
                        var page = pageBase + i;
                        // logger.trace('page to request: ' + page);
                        options.uri = page;
                        paginationPromises.push(rp(options));
                    }
                    // logger.trace("GitHubManager::listTeams(..) - last team page: " + lastPage);
                } else {
                    teamsRaw = fullResponse.body;
                    // don't put anything on the paginationPromise if it isn't paginated
                }

                // logger.trace("GitHubManager::listTeams(..) - before all, raw count: " + teamsRaw.length);

                Promise.all(paginationPromises).then(function (bodies: any[]) {
                    let teams: any = [];

                    //logger.trace("GitHubManager::listTeams(..) - start of all, raw count: " + teamsRaw.length);

                    for (var body of bodies) {
                        teamsRaw = teamsRaw.concat(body.body);
                        //  logger.trace("GitHubManager::listTeams(..) - in all loop, raw count: " + teamsRaw.length);
                    }
                    logger.trace("GitHubManager::listTeams(..) - total team count: " + teamsRaw.length);

                    // logger.trace("GitHubManager::creatlistTeams(..) - success: " + JSON.stringify(fullResponse.body));
                    for (var team of teamsRaw) {
                        let id = team.id;
                        let name = team.name;

                        // logger.info("GitHubManager::listTeams(..) - team: " + JSON.stringify(team));
                        teams.push({id: id, name: name});
                    }

                    fulfill(teams);
                }).catch(function (err) {
                    logger.error("GitHubManager::listTeams(..) - ERROR (inner): " + err);
                    reject(err);
                });

            }).catch(function (err: any) {
                logger.error("GitHubManager::listTeams(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    /**
     * Creates a team for a groupName (e.g., cpsc310_team1).
     *
     * Returns the teamId (used by many other Github calls).
     *
     * @param teamName
     * @param permission 'admin', 'pull', 'push'
     * @returns {Promise<{}>}
     */
    public createTeam(teamName: string, permission: string): Promise<number> {
        let ctx = this;
        logger.info("GitHubManager::createTeam(..) - start");
        return new Promise(function (fulfill, reject) {

            var options = {
                method: 'POST',
                uri: 'https://api.github.com/orgs/' + ctx.ORG_NAME + '/teams',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                },
                body: {
                    name: teamName,
                    permission: permission
                },
                json: true
            };
            rp(options).then(function (body: any) {
                let id = body.id;
                logger.info("GitHubManager::createTeam(..) - success: " + id);
                fulfill({teamName: teamName, teamId: id});
            }).catch(function (err: any) {
                logger.error("GitHubManager::createTeam(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    /**
     * NOTE: needs the team Id (number), not the team name (string)!
     *
     * @param teamId
     * @param repoName
     * @param permission ('pull', 'push', 'admin')
     * @returns {Promise<{}>}
     */
    public addTeamToRepo(teamId: number, repoName: string, permission: string) {
        let ctx = this;
        logger.info("GitHubManager::addTeamToRepo( " + teamId + ", " + repoName + " ) - start");
        return new Promise(function (fulfill, reject) {

            var options = {
                method: 'PUT',
                uri: 'https://api.github.com/teams/' + teamId + '/repos/' + ctx.ORG_NAME + '/' + repoName,
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                },
                body: {
                    permission: permission
                },
                json: true
            };

            rp(options).then(function (body: any) {
                logger.info("GitHubManager::addTeamToRepo(..) - success; team: " + teamId + "; repo: " + repoName);
                // onSuccess(body);
                fulfill({teamId: teamId, repoName: repoName});
            }).catch(function (err: any) {
                logger.error("GitHubManager::addTeamToRepo(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    /**
     * Add a set of Github members (their usernames) to a given team.
     *
     * @param teamId
     * @param members
     * @returns {Promise<number>} where the number is the teamId
     */
    public addMembersToTeam(teamId: number, members: string[]): Promise<number> {
        let ctx = this;
        logger.info("GitHubManager::addMembersToTeam(..) - start; id: " + teamId + "; members: " + JSON.stringify(members));

        return new Promise(function (fulfill, reject) {
            let promises: any = [];
            for (var member of members) {
                logger.info("GitHubManager::addMembersToTeam(..) - adding member: " + member);

                let opts = {
                    method: 'PUT',
                    uri: 'https://api.github.com/teams/' + teamId + '/memberships/' + member,
                    headers: {
                        'Authorization': ctx.GITHUB_AUTH_TOKEN,
                        'User-Agent': ctx.GITHUB_USER_NAME,
                        'Accept': 'application/json'
                    },
                    json: true
                };
                promises.push(rp(opts));
            }

            Promise.all(promises).then(function (results: any) {
                logger.info("GitHubManager::addMembersToTeam(..) - success: " + JSON.stringify(results));
                fulfill(teamId);
            }).catch(function (err: any) {
                logger.error("GitHubManager::addMembersToTeam(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    /**
     * NOTE: needs the team Id (number), not the team name (string)!
     *
     * @param teamId
     * @param repoName
     * @param permission ('pull', 'push', 'admin')
     * @returns {Promise<{}>}
     */
    public addCollaboratorToRepo(userName: string, repoName: string, permission: string): Promise<{}> {
        let ctx = this;
        logger.info("GitHubManager::addCollaboratorToRepo( " + userName + ", " + repoName + " ) - start");
        return new Promise(function (fulfill, reject) {

            var options = {
                method: 'PUT',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/collaborators/' + userName,

                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                },
                body: {
                    permission: permission
                },
                json: true
            };

            rp(options).then(function (body: any) {
                logger.info("GitHubManager::addCollaboratorToRepo(..) - success; user: " + userName + "; repo: " + repoName);
                // onSuccess(body);
                fulfill();
            }).catch(function (err: any) {
                logger.error("GitHubManager::addCollaboratorToRepo(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    /**
     *
     *
     * @param targetRepo
     * @param importRepoUrl
     * @returns {Promise<{}>}
     */
    public importRepoToNewRepo(targetRepo: string, importRepoUrl: string): Promise<{}> {
        let ctx = this;
        logger.info("GitHubManager::importRepoToNewRepo(..) - start");

        return new Promise(function (fulfill, reject) {

            var destinationRepo = 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + targetRepo + '/import';
            logger.info("GitHubManager::importRepoToNewRepo(..) - destination repo: " + destinationRepo + '; import repo: ' + importRepoUrl);

            // https://developer.github.com/v3/migration/source_imports/
            // PUT /repos/:owner/:repo/import
            let opts = {
                method: 'PUT',
                uri: destinationRepo,
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/vnd.github.barred-rock-preview'
                },
                body: {
                    vcs_url: importRepoUrl
                },
                json: true
            };

            rp(opts).then(function (results: any) {
                logger.info("GitHubManager::importRepoToNewRepo(..) - success: " + JSON.stringify(results));
                fulfill(results);
            }).catch(function (err: any) {
                logger.error("GitHubManager::importRepoToNewRepo(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    public checkImportProgress(repoName: string): Promise<{}> {
        let ctx = this;
        logger.info("GitHubManager::checkImportProgress(..) - start");

        return new Promise(function (fulfill, reject) {

            // GET /repos/:owner/:repo/import
            let opts = {
                method: 'GET',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/import',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/vnd.github.barred-rock-preview'
                },
                json: true
            };

            rp(opts).then(function (results: any) {
                logger.info("GitHubManager::checkImportProgress(..) - success: " + results);
                fulfill(results);
            }).catch(function (err: any) {
                logger.error("GitHubManager::checkImportProgress(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    /**
     * Used to provide updated credentials for an import.
     *
     * @param repoName
     * @returns {Promise<{}>}
     */
    public updateImport(repoName: string): Promise<{}> {
        let ctx = this;
        logger.info("GitHubManager::updateImport(..) - start");

        return new Promise(function (fulfill, reject) {

            // PATCH /repos/:owner/:repo/import
            let opts = {
                method: 'PATCH',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/import',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/vnd.github.barred-rock-preview'
                },
                body: {
                    "vcs_username": "foo",
                    "vcs_password": "bar"
                },
                json: true
            };

            rp(opts).then(function (results: any) {
                logger.info("GitHubManager::updateImport(..) - success: " + results);
                fulfill(results);
            }).catch(function (err: any) {
                logger.error("GitHubManager::updateImport(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    public addWebhook(repoName: string, webhookEndpoint: string): Promise<{}> {
        let ctx = this;
        logger.info("GitHubManager::addWebhook(..) - start");

        return new Promise(function (fulfill, reject) {

            // POST /repos/:owner/:repo/hooks
            let opts = {
                method: 'POST',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/hooks',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME
                },
                body: {
                    "name": "web",
                    "active": true,
                    "events": ["commit_comment", "push"],
                    "config": {
                        "url": webhookEndpoint, // "http://skaha.cs.ubc.ca:8080/submit",
                        "content_type": "json"
                    }
                },
                json: true
            };

            if (webhookEndpoint !== null) {
                rp(opts).then(function (results: any) {
                    logger.info("GitHubManager::addWebhook(..) - success: " + results);
                    fulfill(results);
                }).catch(function (err: any) {
                    logger.error("GitHubManager::addWebhook(..) - ERROR: " + err);
                    reject(err);
                });
            } else {
                fulfill({}); // not used anyways
            }
        });
    }

    /**
     * Redelivers the latest webhook payload for a repo.
     *
     * @param repoName
     * @returns {Promise<{}>}
     */
    public redeliverWebhook(repoName: string): Promise<string> {
        let ctx = this;

        logger.info("GitHubManager::redeliverWebhook(..) - start");
        return new Promise(function (fulfill, reject) {

            var options = {
                method: 'GET',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + "/hooks",
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME,
                    'Accept': 'application/json'
                }
            };

            rp(options).then(function (body: any) {
                logger.info("GitHubManager::redeliverWebhook(..) - success; body: " + body);
                let bodyObj = JSON.parse(body);
                let testUrl = bodyObj[0].test_url;

                var optionsInner = {
                    method: 'POST',
                    uri: testUrl,
                    headers: {
                        'Authorization': ctx.GITHUB_AUTH_TOKEN,
                        'User-Agent': ctx.GITHUB_USER_NAME,
                        'Accept': 'application/json'
                    }
                };
                rp(optionsInner).then(function (innerBody: any) {
                    logger.info("GitHubManager::redeliverWebhook(..) - inner success; body: " + innerBody);
                    fulfill(innerBody);
                }).catch(function (innerErr: any) {
                    logger.error("GitHubManager::redeliverWebhook(..) - inner ERROR: " + JSON.stringify(innerErr));
                    reject(innerErr);
                });
            }).catch(function (err: any) {
                logger.error("GitHubManager::redeliverWebhook(..) - ERROR: " + JSON.stringify(err));
                reject(err);
            });

        });
    }

    public getStats(orgName: string, repoName: string): Promise<{}> {
        let ctx = this;
        // logger.info("GitHubManager::getStats(..) - start");

        return new Promise(function (fulfill, reject) {

            // POST /repos/:owner/:repo/hooks
            let opts = {
                method: 'GET',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/stats/commit_activity',
                // uri:                     'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/stats/contributors',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME
                },
                body: {},
                json: true,
                resolveWithFullResponse: true
            };

            rp(opts).then(function (response: any) {
                let code = response.statusCode;

                if (code !== 200) {
                    logger.warn("GitHubManager::getStats(..) - code: " + code + "; for: " + repoName);
                }
                let count = 0;
                for (var week of response.body) {
                    count += week.total;
                }
                count = count - 28;
                // logger.info("GitHubManager::getStats(..) - success (" + code + "); total: " + count + "; data: " + JSON.stringify(response.body));
                // console.log(repoName + "," + count);
                console.log(count);

                let results = {};
                fulfill(results);
            }).catch(function (err: any) {
                logger.error("GitHubManager::getStats(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    public getLastSHA(orgName: string, repoName: string, targetTs: Date): Promise<GroupCommit> {
        let ctx = this;
        // logger.info("GitHubManager::getStats(..) - start");

        if (typeof targetTs === 'undefined') {
            targetTs = null;
        }

        return new Promise(function (fulfill, reject) {

            // GET /repos/:owner/:repo/commits
            let opts = {
                method: 'GET',
                uri: 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/commits',
                // uri:                     'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/stats/contributors',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME
                },
                body: {},
                json: true,
                resolveWithFullResponse: true
            };

            rp(opts).then(function (response: any) {
                let code = response.statusCode;
                let commits = response.body;
                let sha: string = null;
                if (targetTs === null) {
                    // return first one
                    let commit = commits[0];
                    let sha = commit.sha;
                } else {
                    let date: Date = null;
                    let lastDate: Date = null;
                    for (var commit of commits) {

                        let dateStr = commit.commit.author.date;
                        date = new Date(dateStr);
                        //console.log('considering: ' + date + '; lastDate: ' + lastDate);
                        // figure out which one to use and break
                        if (date.getTime() < targetTs.getTime()) {
                            // we wanted the last one
                            //if (sha === null) {
                            // console.log('using last sha');
                            // aka the last one is the right one, need to set the sha and lastDate
                            lastDate = date;
                            sha = commit.sha;
                            //} else {
                            // use the existing sha
                            //  console.log('using cached sha for ' + lastDate + ' instead of ' + date);
                            //}
                            logger.trace('found it; ' + sha + '; @ ' + lastDate);
                            break;
                        } else {
                            sha = commit.sha;
                            lastDate = date;
                        }
                    }
                }

                if (sha === null) {
                    logger.warn("GitHubManager::getLastSHA(..) - repo: " + repoName + "; no matching SHA!");
                }
                logger.info("GitHubManager::getLastSHA(..) - repo: " + repoName + "; sha: " + sha);

                let results = {repoName: repoName, sha: sha};
                fulfill(results);
            }).catch(function (err: any) {
                logger.error("GitHubManager::getLastSHA(..) - ERROR: " + err);
                reject(err);
            });
        });
    }

    public makeCommitComment(orgName: string, repoName: string, sha: string, msg: string, delay: number): Promise<boolean> {
        let ctx = this;
        // Log.info("GitHubManager::getStats(..) - start");

        return new Promise(function (fulfill, reject) {

            let url = 'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/commits/' + sha + '/comments';
            // Log.info("GitHubManager::makeCommitComment(..) - url: " + url);
            // POST /repos/:owner/:repo/commits/:sha/comments
            let opts = {
                method: 'POST',
                uri: url,
                // uri:                     'https://api.github.com/repos/' + ctx.ORG_NAME + '/' + repoName + '/stats/contributors',
                headers: {
                    'Authorization': ctx.GITHUB_AUTH_TOKEN,
                    'User-Agent': ctx.GITHUB_USER_NAME
                },
                body: {
                    body: msg
                },
                json: true,
                resolveWithFullResponse: true
            };

            ctx.delay(delay).then(function () {

                return rp(opts);
            }).then(function (response: any) {
                let code = response.statusCode;

                if (code === 201) {
                    // https://github.com/CS310-2016Fall/cpsc310project_team56/commit/d7db6c2f351ee3b73e70aec329f34caf767bd562
                    let commitURL = 'https://github.com/' + ctx.ORG_NAME + '/' + repoName + '/commit/' + sha;
                    logger.info("GitHubManager::makeCommitComment(..) - comment posted to: " + repoName + " @ " + commitURL);
                } else {
                    logger.error("GitHubManager::makeCommitComment(..) - ERROR posting comment");
                }

                fulfill(true);
            }).catch(function (err: any) {
                logger.error("GitHubManager::makeCommitComment(..) - ERROR: " + err);
                reject(err);
            });
        });
    }


    public createAllRepos(groupData: GroupRepoDescription[]): Promise<any[]> {
        let ctx = this;
        logger.info("GitHubManager::createAllRepos(..) - start");

        let promises: Promise<any>[] = [];

        for (var gd of groupData) {
            let repoName = gd.projectName;
            logger.trace("GitHubManager::createAllRepos(..) - pushing: " + repoName);
            promises.push(ctx.createRepo(repoName));
        }
        logger.info("GitHubManager::createAllRepos(..) - all pushed");

        return Promise.all(promises);
    }

    public importAllRepos(groupData: GroupRepoDescription[], importRepoUrl: string): Promise<any[]> {
        logger.info("GitHubManager::importAllRepos(..) - start");

        let promises: Promise<any>[] = [];
        for (var gd of groupData) {
            let repoName = gd.projectName;
            logger.trace("GitHubManager::importAllRepos(..) - pushing: " + repoName);
            promises.push(this.importRepoToNewRepo(repoName, importRepoUrl));
        }
        logger.info("GitHubManager::importAllRepos(..) - all pushed");

        return Promise.all(promises);
    }

    public createAllTeams(groupData: GroupRepoDescription[], permissions: string): Promise<any[]> {
        logger.info("GitHubManager::crateAllTeams(..) - start");

        let promises: Promise<any>[] = [];
        for (var gd of groupData) {
            let teamName = gd.teamName;
            logger.trace("GitHubManager::crateAllTeams(..) - pushing: " + teamName);
            promises.push(this.createTeam(teamName, permissions));
        }
        logger.info("GitHubManager::crateAllTeams(..) - all pushed");

        return Promise.all(promises);
    }

    public getTeamNumber(teamName: string): Promise<number> {
        logger.info("GitHubManager::getTeamNumber( " + teamName + " ) - start");
        let ctx = this;

        return new Promise(function (fulfill, reject) {
            let teamId = -1;
            ctx.listTeams().then(function (teamList: any) {
                // this is pretty verbose once we have many teams
                // logger.trace("GitHubManager::getTeamNumber(..) - all teams: " + JSON.stringify(teamList));
                for (var team of teamList) {
                    if (team.name === teamName) {
                        teamId = team.id;
                        logger.info("GitHubManager::getTeamNumber(..) - matched team: " + teamName + "; id: " + teamId);
                    }
                }

                if (teamId < 0) {
                    reject('GitHubManager::getTeamNumber(..) - ERROR: Could not find team: ' + teamName);
                } else {
                    fulfill(teamId);
                }
            }).catch(function (err) {
                logger.error("GitHubManager::addTeamToRepos(..) - could not match team: " + teamName + "; ERROR: " + err);
                reject(err);
            });
        });
    }

    public addTeamToRepos(groupData: GroupRepoDescription[], adminTeamName: string, permissions: string) {
        logger.info("GitHubManager::addTeamToRepos(..) - start");
        let ctx = this;

        return new Promise(function (fulfill, reject) {
            let teamId = -1;
            ctx.listTeams().then(function (teamList: any) {
                logger.info("GitHubManager::addTeamToRepos(..) - all teams: " + JSON.stringify(teamList));
                for (var team of teamList) {
                    if (team.name === adminTeamName) {
                        teamId = team.id;
                        logger.info("GitHubManager::addTeamToRepos(..) - matched admin team; id: " + teamId);
                    }
                }
                if (teamId < 0) {
                    throw new Error('Could not find team called: ' + adminTeamName);
                }
                let promises: Promise<any>[] = [];

                for (var gd of groupData) {
                    let repoName = gd.projectName;
                    promises.push(ctx.addTeamToRepo(teamId, repoName, permissions));
                }
                logger.info("GitHubManager::addTeamToRepos(..) - all addTeams pushed");

                Promise.all(promises).then(function (allDone) {
                    logger.info("GitHubManager::addTeamToRepos(..) - all done; final: " + JSON.stringify(allDone));
                    // Promise.resolve(allDone);
                    fulfill(allDone);
                }).catch(function (err) {
                    logger.info("GitHubManager::addTeamToRepos(..) - all done ERROR: " + err);
                    // Promise.reject(err);
                    reject(err);
                });

                //}).then(function (res: any) {
                //    logger.info("GitHubManager::addTeamToRepos(..) - done; team added to all repos: " + JSON.stringify(res));
                //    fulfill(res);
            }).catch(function (err: any) {
                logger.info("GitHubManager::addTeamToRepos(..) - ERROR: " + err);
                reject(err);
            });

            logger.info("GitHubManager::addTeamToRepos(..) - end");
        });
    }


    completeTeamProvision(inputGroup: GroupRepoDescription, importUrl: string, staffTeamName: string, webhookEndpoint: string): Promise<GroupRepoDescription> {
        let that = this;
        logger.info("GitHubManager::completeTeamProvision(..) - start: " + JSON.stringify(inputGroup));
        return new Promise(function (fulfill, reject) {

            const DELAY = that.DELAY_SEC * 3; // 2 would be enough, but let's just be safe
            // slow down creation to avoid getting in trouble with GH
            that.delay(inputGroup.teamIndex * DELAY).then(function () {
                logger.info("GitHubManager::completeTeamProvision(..) - creating project: " + inputGroup.projectName);
                return that.createRepo(inputGroup.projectName);
            }).then(function (url: string) {
                inputGroup.url = url;
                // let importUrl = 'https://github.com/CS310-2016Fall/cpsc310project';
                logger.info("GitHubManager::completeTeamProvision(..) - project created; importing url: " + importUrl);
                return that.importRepoToNewRepo(inputGroup.projectName, importUrl);
            }).then(function () {
                logger.info("GitHubManager::completeTeamProvision(..) - import started; adding webhook");
                return that.addWebhook(inputGroup.projectName, webhookEndpoint);
            }).then(function () {
                logger.info("GitHubManager::completeTeamProvision(..) - webhook added; creating team: " + inputGroup.teamName);
                return that.createTeam(inputGroup.teamName, 'push');

            }).then(function (teamDeets: any) {
                var teamId = teamDeets.teamId;
                logger.info("GitHubManager::completeTeamProvision(..) - team created ( " + teamId + " ) ; adding members: " + JSON.stringify(inputGroup.members));
                return that.addMembersToTeam(teamId, inputGroup.members);

            }).then(function (teamId: number) {
                logger.info("GitHubManager::completeTeamProvision(..) - members added to team ( " + teamId + " ); adding team to project");
                const TEAM_PERMISSIONS = 'push';
                return that.addTeamToRepo(teamId, inputGroup.projectName, TEAM_PERMISSIONS);
            }).then(function () {
                logger.info("GitHubManager::completeTeamProvision(..) - team added to repo; getting staff team number");
                // let staffTeamName = '310staff';
                return that.getTeamNumber(staffTeamName);
            }).then(function (staffTeamNumber: number) {
                logger.info("GitHubManager::completeTeamProvision(..) - found staff team number ( " + staffTeamNumber + " ); adding staff to repo");
                const STAFF_PERMISSIONS = 'admin';
                return that.addTeamToRepo(staffTeamNumber, inputGroup.projectName, STAFF_PERMISSIONS);
            }).then(function () {
                logger.info("GitHubManager::completeTeamProvision(..) - admin staff added to repo; saving url");
                return that.setGithubUrl(inputGroup.team, inputGroup.url);
            }).then(function () {
                logger.info("GitHubManager::completeTeamProvision(..) - process complete for: " + JSON.stringify(inputGroup));
                fulfill(inputGroup);
            }).catch(function (err) {
                // logger.error("GitHubManager::completeTeamProvision(..) - ERROR: " + err);
                logger.error("******");
                logger.error("******");
                logger.error("Input Description: " + JSON.stringify(inputGroup));
                logger.error("GitHubManager::completeTeamProvision(..) - ERROR: " + err);
                logger.error("******");
                logger.error("******");

                inputGroup.url = "";
                reject(err);
            });
        });
    }

    completeIndividualProvision(inputGroup: GroupRepoDescription, importUrl: string, staffTeamName: string, webhookEndpoint: string): Promise<GroupRepoDescription> {
        let that = this;
        logger.info("GitHubManager::completeIndividualProvision(..) - start: " + JSON.stringify(inputGroup));
        return new Promise(function (fulfill, reject) {

            const DELAY = 10000;
            // slow down creation to avoid getting in trouble with GH
            that.delay(inputGroup.teamIndex * DELAY).then(function () {
                logger.info("GitHubManager::completeIndividualProvision(..) - creating project: " + inputGroup.projectName);
                return that.createRepo(inputGroup.projectName);
            }).then(function (url: string) {
                inputGroup.url = url;
                // let importUrl = 'https://github.com/CS310-2016Fall/cpsc310project';
                logger.info("GitHubManager::completeIndividualProvision(..) - project created; importing url: " + importUrl);
                return that.importRepoToNewRepo(inputGroup.projectName, importUrl);
            }).then(function () {
                logger.info("GitHubManager::completeIndividualProvision(..) - import started; adding webhook");
                return that.addWebhook(inputGroup.projectName, webhookEndpoint);
            }).then(function () {
                // add individual to repo
                logger.info("GitHubManager::completeIndividualProvision(..) - webhook added; adding user: " + inputGroup.members[0]);
                return that.addCollaboratorToRepo(inputGroup.members[0], inputGroup.projectName, 'push');
                /*
                 // don't need teams for individual repos
                 .then(function () {
                 logger.info("GitHubManager::completeIndividualProvision(..) - webhook added; creating team: " + inputGroup.teamName);
                 return that.createTeam(inputGroup.teamName, 'push');
                 }).then(function (teamDeets: any) {
                 var teamId = teamDeets.teamId;
                 logger.info("GitHubManager::completeIndividualProvision(..) - team created ( " + teamId + " ) ; adding members: " + JSON.stringify(inputGroup.members));
                 return that.addMembersToTeam(teamId, inputGroup.members);
                 }).then(function (teamId: number) {
                 logger.info("GitHubManager::completeIndividualProvision(..) - members added to team ( " + teamId + " ); adding team to project");
                 const TEAM_PERMISSIONS = 'push';
                 return that.addTeamToRepo(teamId, inputGroup.projectName, TEAM_PERMISSIONS);
                 */
            }).then(function () {
                logger.info("GitHubManager::completeIndividualProvision(..) - person added to repo; getting staff team number for: " + staffTeamName);
                // let staffTeamName = '310staff';
                return that.getTeamNumber(staffTeamName);
            }).then(function (staffTeamNumber: number) {
                logger.info("GitHubManager::completeIndividualProvision(..) - found staff team number ( " + staffTeamNumber + " ); adding staff to repo");
                const STAFF_PERMISSIONS = 'admin';
                return that.addTeamToRepo(staffTeamNumber, inputGroup.projectName, STAFF_PERMISSIONS);
            }).then(function () {
                logger.info("GitHubManager::completeIndividualProvision(..) - admin staff added to repo; setting individual URL");
                // TODO: write githubURL as importUrl
                return that.setIndividualUrl(inputGroup.members[0], inputGroup.url);
            }).then(function () {
                logger.info("GitHubManager::completeIndividualProvision(..) - process complete for: " + JSON.stringify(inputGroup));
                fulfill(inputGroup);
            }).catch(function (err) {
                logger.error("******");
                logger.error("******");
                logger.error("Input Description: " + JSON.stringify(inputGroup));
                logger.error("GitHubManager::completeIndividualProvision(..) - ERROR: " + err);
                logger.error("******");
                logger.error("******");
                inputGroup.url = "";
                reject(err);
            });
        });
    }


    provisionRepo(inputGroup: GroupRepoDescription, repoName: string, importURL: string): Promise<GroupRepoDescription> {
        let that = this;
        logger.info("GitHubManager::provisionRepo(..) - start: " + JSON.stringify(inputGroup));
        return new Promise(function (fulfill, reject) {

            let initDelay = 60 * 1000;
            that.delay((inputGroup.teamIndex * 5000) + initDelay).then(function () {
                logger.info("GitHubManager::provisionProject(..) - creating repo: " + repoName);
                return that.createRepo(repoName);
            }).then(function (url: string) {
                logger.info("GitHubManager::provisionProject(..) - repo created; importing url: " + importURL);
                return that.importRepoToNewRepo(repoName, importURL);
            }).then(function () {
                logger.info("GitHubManager::provisionProject(..) - repo imported; getting team number for: " + inputGroup.teamName);
                return that.getTeamNumber(inputGroup.teamName);
            }).then(function (teamId: number) {
                logger.info("GitHubManager::provisionProject(..) - have team id ( " + teamId + " ); adding to repo");
                return that.addTeamToRepo(teamId, repoName, 'push');
            }).then(function () {
                logger.info("GitHubManager::provisionProject(..) - team added to repo; getting staff team number");
                return that.getTeamNumber('310Staff');
            }).then(function (staffTeamNumber: number) {
                logger.info("GitHubManager::provisionProject(..) - found staff team number ( " + staffTeamNumber + " ); adding staff to repo");
                return that.addTeamToRepo(staffTeamNumber, repoName, 'admin');
            }).then(function () {
                logger.info("GitHubManager::provisionProject(..) - process complete for: " + JSON.stringify(inputGroup));
                fulfill(inputGroup);
            }).catch(function (err) {
                logger.error("GitHubManager::provisionProject(..) - ERROR: " + err);
                reject(err);
            });
        });
    }


    completeClean(inputGroup: GroupRepoDescription): Promise < GroupRepoDescription > {
        let that = this;
        logger.info("GitHubManager::completeClean(..) - start: " + JSON.stringify(inputGroup));
        return new Promise(function (fulfill, reject) {

            logger.info("GitHubManager::completeClean(..) - removing project: " + inputGroup.projectName);

            that.deleteRepo(inputGroup.projectName).then(function (url: string) {

                logger.info("GitHubManager::completeClean(..) - project removed; removing team");

                return that.deleteTeam(inputGroup.teamName);

            }).then(function () {
                logger.info("GitHubManager::completeClean(..) - team removed; all done.");

                fulfill(inputGroup);
            }).catch(function (err) {
                logger.error("GitHubManager::completeTeamProvision(..) - ERROR: " + err);
                inputGroup.url = "";
                reject(err);
            });
        });
    }


    delay(ms: number): Promise < {} > {
        // logger.info("GitHubManager::delay( " + ms + ") - start");
        return new Promise(function (resolve, reject) {
            let fire = new Date(new Date().getTime() + ms);
            logger.info("GitHubManager::delay( " + ms + " ms ) - waiting; will trigger at " + fire.toLocaleTimeString());
            setTimeout(resolve, ms);
        });
    }


} // end class