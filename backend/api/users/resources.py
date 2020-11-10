from flask_restful import Resource, current_app, request
from schematics.exceptions import DataError

from backend.models.dtos.user_dto import (
    UserSearchQuery,
    UserDTO,
    AssignTasksDTO,
    UnassignTasksDTO,
)
from backend.services.users.authentication_service import token_auth, tm
from backend.services.users.user_service import UserService, UserServiceError, NotFound
from backend.services.mapping_service import MappingServiceError, MappingService
from backend.services.validator_service import ValidatorServiceError
from backend.models.postgis.utils import UserLicenseError
from backend.services.project_service import ProjectService


class UserAPI(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def get(self, username):
        """
        Gets user information
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: User found
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserService.get_user_dto_by_username(
                username, tm.authenticated_user_id
            )
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class UsersRestAPI(Resource):
    @token_auth.login_required
    def get(self, user_id):
        """
        Get user information by id
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded sesesion token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: user_id
              in: path
              description: The id of the user
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: User found
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserService.get_user_dto_by_id(user_id)
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"Userid GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch user details"}, 500


class UserUpdateAPI(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def post(self):
        """
        Updates user info
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: body
              name: body
              required: true
              description: JSON object for creating draft project
              schema:
                  properties:
                      emailAddress:
                          type: string
                          default: test@test.com
                      twitterId:
                          type: string
                          default: tweeter
                      facebookId:
                          type: string
                          default: fbme
                      linkedinId:
                          type: string
                          default: linkme
        responses:
            200:
                description: Details saved
            400:
                description: Client Error - Invalid Request
            401:
                description: Unauthorized - Invalid credentials
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserDTO(request.get_json())
            if user_dto.email_address == "":
                user_dto.email_address = (
                    None  # Replace empty string with None so validation doesn't break
                )

            user_dto.validate()
        except DataError as e:
            current_app.logger.error(f"error validating request: {str(e)}")
            return str(e), 400

        try:
            verification_sent = UserService.update_user_details(
                tm.authenticated_user_id, user_dto
            )
            return verification_sent, 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class UsersAllAPI(Resource):
    @token_auth.login_required
    def get(self):
        """
        Get paged list of all usernames
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded sesesion token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: query
              name: page
              description: Page of results user requested
              type: integer
            - in: query
              name: username
              description: Full or part username
              type: string
            - in: query
              name: role
              description: Role of User, eg ADMIN, PROJECT_MANAGER
              type: string
            - in: query
              name: level
              description: Level of User, eg BEGINNER
              type: string
        responses:
            200:
                description: Users found
            401:
                description: Unauthorized - Invalid credentials
            500:
                description: Internal Server Error
        """
        try:
            query = UserSearchQuery()
            query.page = (
                int(request.args.get("page")) if request.args.get("page") else 1
            )
            query.username = request.args.get("username")
            query.mapping_level = request.args.get("level")
            query.role = request.args.get("role")
            query.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Unable to fetch user list"}, 400

        try:
            users_dto = UserService.get_all_users(query)
            return users_dto.to_primitive(), 200
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch user list"}, 500


class AssignTasksAPI(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def post(self, project_id):
        """
        Manually assign tasks to a user
        ---
        tags:
            - project-admin
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: project_id
              in: path
              description: The ID of the project the task is associated with
              required: true
              type: integer
              default: 1
            - name: username
              in: query
              description: The username to assign the task to
              required: true
              type: string
              default: Thinkwhere
            - in: body
              name: tasks
              required: true
              description: JSON object for locking task(s)
              schema:
                  properties:
                      taskIds:
                          type: array
                          items:
                              type: integer
                          description: Array of taskIds for locking
                          default: [1,2]
        responses:
            200:
                description: Task(s) assigned to user
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: Task(s) or User not found
            500:
                description: Internal Server Error
        """
        try:
            assign_tasks_dto = AssignTasksDTO(request.get_json())
            assign_tasks_dto.assigner_id = tm.authenticated_user_id
            user_id = UserService.get_user_by_username(request.args.get("username")).id
            assign_tasks_dto.assignee_id = user_id
            assign_tasks_dto.project_id = project_id
            assign_tasks_dto.preferred_locale = request.environ.get(
                "HTTP_ACCEPT_LANGUAGE"
            )
            assign_tasks_dto.validate()

        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return str(e), 400

        try:
            task = MappingService.assign_tasks(assign_tasks_dto)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found"}, 404
        except (MappingServiceError, ValidatorServiceError) as e:
            return {"Error": str(e)}, 403
        except UserLicenseError:
            return {"Error": "User not accepted license terms"}, 409
        except Exception as e:
            error_msg = f"Task Assign API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UnassignTasksAPI(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def post(self, project_id):
        """
        Manually unassign tasks
        ---
        tags:
            - project-admin
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: project_id
              in: path
              description: The ID of the project the task is associated with
              required: true
              type: integer
              default: 1
            - in: body
              name: tasks
              required: true
              description: JSON object for unassigning task(s)
              schema:
                  properties:
                      taskIds:
                          type: array
                          items:
                              type: integer
                          description: Array of taskIds for unassigning
                          default: [1,2]
        responses:
            200:
                description: Task(s) unassigned
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: Task(s) not found
            500:
                description: Internal Server Error
        """
        try:
            unassign_tasks_dto = UnassignTasksDTO(request.get_json())
            unassign_tasks_dto.project_id = project_id
            unassign_tasks_dto.assigner_id = tm.authenticated_user_id
            unassign_tasks_dto.preferred_locale = request.environ.get(
                "HTTP_ACCEPT_LANGUAGE"
            )
            unassign_tasks_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return str(e), 400

        try:
            task = MappingService.unassign_tasks(unassign_tasks_dto)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found"}, 404
        except (MappingServiceError, ValidatorServiceError) as e:
            return {"Error": str(e)}, 403
        except UserLicenseError:
            return {"Error": "User not accepted license terms"}, 409
        except Exception as e:
            error_msg = f"Task UnAssign API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UserAssignedTasks(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def get(self, username):
        """
        Get assigned tasks either assigned to or assigned by user
        ---
        tags:
            - user
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: username
              in: path
              description: The users username
              required: true
              type: string
            - in: query
              name: asAssigner
              description: treats user as assigner, rather than assignee, if true
              type: string
            - in: query
              name: sortBy
              description: field to sort by, defaults to assigned_date
              type: string
            - in: query
              name: sortDirection
              description: direction of sort, defaults to desc
              type: string
            - in: query
              name: page
              description: Page of results user requested
              type: integer
            - in: query
              name: pageSize
              description: Size of page, defaults to 10
              type: integer
            - in: query
              name: project
              description: Optional project filter
              type: integer
            - in: query
              name: closed
              description: Optional filter for open/closed assignments
              type: boolean
        responses:
            200:
                description: User's assigned tasks
            404:
                description: No assigned tasks
            500:
                description: Internal Server Error
        """
        try:
            sort_column_map = {
                "assignedDate": "assigned_date",
                "projectId": "project_id",
            }
            sort_column = sort_column_map.get(
                request.args.get("sortBy"), sort_column_map["assignedDate"]
            )

            # closed needs to be set to True, False, or None
            closed = None
            if request.args.get("closed") == "true":
                closed = True
            elif request.args.get("closed") == "false":
                closed = False

            # task status needs to be set to None or one of the statuses
            task_status = request.args.get("taskStatus") or None

            # sort direction should only be desc or asc
            if request.args.get("sortDirection") in ("asc", "desc"):
                sort_direction = request.args.get("sortDirection")
            else:
                sort_direction = "desc"

            assigned_tasks = UserService.get_user_assigned_tasks(
                request.args.get("asAssigner") == "true",
                username,
                request.environ.get("HTTP_ACCEPT_LANGUAGE"),
                closed,
                task_status,
                request.args.get("project", None, type=int),
                request.args.get("page", None, type=int),
                request.args.get("pageSize", None, type=int),
                sort_column,
                sort_direction,
            )

            return assigned_tasks.to_primitive(), 200
        except NotFound:
            return {"Error": "No assigned tasks"}, 404
        except Exception as e:
            error_msg = f"Assigned Tasks API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UsersQueriesUsernameAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get user information by OpenStreetMap username
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's OpenStreetMap username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: User found
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserService.get_user_dto_by_username(
                username, token_auth.current_user()
            )
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch user details"}, 500


class UsersQueriesUsernameFilterAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get paged lists of users matching OpenStreetMap username filter
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's partial or full OpenStreetMap username
              type: string
              default: ab
            - in: query
              name: page
              description: Page of results user requested
              type: integer
            - in: query
              name: projectId
              description: Optional, promote project participants to head of results
              type: integer
        responses:
            200:
                description: Users found
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            page = int(request.args.get("page")) if request.args.get("page") else 1
            project_id = request.args.get("projectId", None, int)
            users_dto = UserService.filter_users(username, project_id, page)
            return users_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch matching users"}, 500


class UsersQueriesOwnLockedAPI(Resource):
    @token_auth.login_required
    def get(self):
        """
        Gets any locked task on the project for the logged in user
        ---
        tags:
            - mapping
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
        responses:
            200:
                description: Task user is working on
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User is not working on any tasks
            500:
                description: Internal Server Error
        """
        try:
            locked_tasks = ProjectService.get_task_for_logged_in_user(
                token_auth.current_user()
            )
            return locked_tasks.to_primitive(), 200
        except Exception as e:
            error_msg = f"UsersQueriesOwnLockedAPI - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UsersQueriesOwnLockedDetailsAPI(Resource):
    @token_auth.login_required
    def get(self):
        """
        Gets details of any locked task for the logged in user
        ---
        tags:
            - mapping
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
        responses:
            200:
                description: Task user is working on
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User is not working on any tasks
            500:
                description: Internal Server Error
        """
        try:
            preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            locked_tasks = ProjectService.get_task_details_for_logged_in_user(
                token_auth.current_user(), preferred_locale
            )
            return locked_tasks.to_primitive(), 200
        except NotFound:
            return {"Error": "User has no locked tasks"}, 404
        except Exception as e:
            error_msg = f"UsersQueriesOwnLockedDetailsAPI - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UsersQueriesFavoritesAPI(Resource):
    @token_auth.login_required
    def get(self):
        """
        Get projects favorited by a user
        ---
        tags:
          - favorites
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
        responses:
            200:
                description: Projects favorited by user
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            favs_dto = UserService.get_projects_favorited(token_auth.current_user())
            return favs_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"UserFavorites GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UsersQueriesInterestsAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get interests by username
        ---
        tags:
          - interests
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's OpenStreetMap username
              required: true
              type: string
        responses:
            200:
                description: User interests returned
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            user = UserService.get_user_by_username(username)
            interests_dto = UserService.get_interests(user)
            return interests_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"UserInterests GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UsersRecommendedProjectsAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get recommended projects for a user
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's OpenStreetMap username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: Recommended projects found
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: No recommended projects found
            500:
                description: Internal Server Error
        """
        try:
            locale = (
                request.environ.get("HTTP_ACCEPT_LANGUAGE")
                if request.environ.get("HTTP_ACCEPT_LANGUAGE")
                else "en"
            )
            user_dto = UserService.get_recommended_projects(username, locale)
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UserOSMAPI(Resource):
    def get(self, username):
        """
        Gets details from OSM for the specified username
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: User found
            404:
                description: User not found
            500:
                description: Internal Server Error
            502:
                description: Bad response from OSM
        """
        try:
            osm_dto = UserService.get_osm_details_for_user(username)
            return osm_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except UserServiceError as e:
            return {"Error": str(e)}, 502
        except Exception as e:
            error_msg = f"User OSM GET - unhandled error: {str(e)}"
            current_app.logger.error(error_msg)
            return {"error": error_msg}, 500


class UserMappedProjects(Resource):
    def get(self, username):
        """
        Gets projects user has mapped
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: Mapped projects found
            404:
                description: No mapped projects found
            500:
                description: Internal Server Error
        """
        try:
            locale = (
                request.environ.get("HTTP_ACCEPT_LANGUAGE")
                if request.environ.get("HTTP_ACCEPT_LANGUAGE")
                else "en"
            )
            user_dto = UserService.get_mapped_projects(username, locale)
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class UserSetRole(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def post(self, username, role):
        """
        Allows PMs to set the users role
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
            - name: role
              in: path
              description: The role to add
              required: true
              type: string
              default: ADMIN
        responses:
            200:
                description: Role set
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.add_role_to_user(tm.authenticated_user_id, username, role)
            return {"Success": "Role Added"}, 200
        except UserServiceError:
            return {"Error": "Not allowed"}, 403
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class UserSetLevel(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def post(self, username, level):
        """
        Allows PMs to set a users mapping level
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
            - name: level
              in: path
              description: The mapping level that should be set
              required: true
              type: string
              default: ADVANCED
        responses:
            200:
                description: Level set
            400:
                description: Bad Request - Client Error
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.set_user_mapping_level(username, level)
            return {"Success": "Level set"}, 200
        except UserServiceError:
            return {"Error": "Not allowed"}, 400
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class UserSetExpertMode(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def post(self, is_expert):
        """
        Allows user to enable or disable expert mode
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: is_expert
              in: path
              description: true to enable expert mode, false to disable
              required: true
              type: string
        responses:
            200:
                description: Mode set
            400:
                description: Bad Request - Client Error
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.set_user_is_expert(
                tm.authenticated_user_id, is_expert == "true"
            )
            return {"Success": "Expert mode updated"}, 200
        except UserServiceError:
            return {"Error": "Not allowed"}, 400
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"UserSetExpert POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class UserAcceptLicense(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def post(self, license_id):
        """
        Post to indicate user has accepted license terms
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: license_id
              in: path
              description: ID of license terms have been accepted for
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Terms accepted
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User or license not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.accept_license_terms(tm.authenticated_user_id, license_id)
            return {"Success": "Terms Accepted"}, 200
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500
