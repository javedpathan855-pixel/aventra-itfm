# API Rules

Route/API boundary:
1. Parse request.
2. Authenticate.
3. Authorize.
4. Validate input.
5. Invoke application/use case.
6. Map output.
7. Map errors safely.

Never put a full business workflow, ORM implementation, or duplicated business rules inside a route handler.
