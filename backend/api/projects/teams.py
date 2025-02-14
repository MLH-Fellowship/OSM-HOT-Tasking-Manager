from flask_restful import Resource, request, current_app
from schematics.exceptions import DataError

from backend.services.team_service import TeamService, TeamServiceError, NotFound
from backend.services.users.authentication_service import token_auth


class ProjectsTeamsAPI(Resource):
    @token_auth.login_required
    def get(self, project_id):
        """Get teams assigned with a project
        ---
        tags:
          - teams
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Teams listed successfully
            403:
                description: Forbidden, if user is not authenticated
            404:
                description: Not found
            500:
                description: Internal Server Error
        """
        try:
            teams_dto = TeamService.get_project_teams_as_dto(project_id)
            return teams_dto.to_primitive(), 200
        except Exception as e:
            error_msg = f"Team GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg, "SubCode": "InternalServerError"}, 500

    @token_auth.login_required
    def post(self, team_id, project_id):
        """Assign a team to a project
        ---
        tags:
          - teams
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
            - name: team_id
              in: path
              description: Unique team ID
              required: true
              type: integer
              default: 1
            - in: body
              name: body
              required: true
              description: The role that the team will have on the project
              schema:
                  properties:
                      role:
                        type: string
        responses:
            201:
                description: Team project assignment created
            401:
                description: Forbidden, if user is not a manager of the project
            403:
                description: Forbidden, if user is not authenticated
            404:
                description: Not found
            500:
                description: Internal Server Error
        """
        if not TeamService.is_user_team_manager(team_id, token_auth.current_user()):
            return {
                "Error": "User is not an admin or a manager for the team",
                "SubCode": "UserPermissionError",
            }, 401

        try:
            role = request.get_json(force=True)["role"]
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": str(e), "SubCode": "InvalidData"}, 400

        try:
            TeamService.add_team_project(team_id, project_id, role)
            return (
                {
                    "Success": "Team {} assigned to project {} with role {}".format(
                        team_id, project_id, role
                    )
                },
                201,
            )
        except Exception as e:
            error_msg = f"Project Team POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg, "SubCode": "InternalServerError"}, 500

    @token_auth.login_required
    def patch(self, team_id, project_id):
        """Update role of a team on a project
        ---
        tags:
          - teams
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
            - name: team_id
              in: path
              description: Unique team ID
              required: true
              type: integer
              default: 1
            - in: body
              name: body
              required: true
              description: The role that the team will have on the project
              schema:
                  properties:
                      role:
                        type: string
        responses:
            201:
                description: Team project assignment created
            401:
                description: Forbidden, if user is not a manager of the project
            403:
                description: Forbidden, if user is not authenticated
            404:
                description: Not found
            500:
                description: Internal Server Error
        """
        if not TeamService.is_user_team_manager(team_id, token_auth.current_user()):
            return {"Error": "User is not an admin or a manager for the team"}, 401
        try:
            role = request.get_json(force=True)["role"]
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": str(e), "SubCode": "InvalidData"}, 400

        try:
            TeamService.change_team_role(team_id, project_id, role)
            return {"Status": "Team role updated successfully."}, 200
        except NotFound as e:
            return {"Error": str(e), "SubCode": "NotFound"}, 404
        except TeamServiceError as e:
            return str(e), 402
        except Exception as e:
            error_msg = f"Team-Project PATCH - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg, "SubCode": "InternalServerError"}, 500

    @token_auth.login_required
    def delete(self, team_id, project_id):
        """
        Deletes the specified team project assignment
        ---
        tags:
          - teams
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: message_id
              in: path
              description: Unique message ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Team unassigned of the project
            401:
                description: Forbidden, if user is not a manager of the project
            403:
                description: Forbidden, if user is not authenticated
            404:
                description: Not found
            500:
                description: Internal Server Error
        """
        if not TeamService.is_user_team_manager(team_id, token_auth.current_user()):
            return {"Error": "User is not an admin or a manager for the team"}, 401
        try:
            TeamService.delete_team_project(team_id, project_id)
            return {"Success": True}, 200
        except NotFound:
            return {"Error": "No team found", "SubCode": "NotFound"}, 404
        except Exception as e:
            error_msg = f"TeamMembers DELETE - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg, "SubCode": "InternalServerError"}, 500
