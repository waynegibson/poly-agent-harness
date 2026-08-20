# Type-system discipline

Use the static type system to eliminate invalid programs before runtime. Encode
business invariants in types instead of relying on comments, conventions, or
repeated defensive checks.

## Make illegal states unrepresentable

Model each valid state as a distinct variant. Prefer discriminated unions over
objects whose booleans and optional fields permit contradictory combinations.

For example, represent a result as either `{ status: "success"; data: T }` or
`{ status: "error"; error: string }`, not as one object with optional `data` and
`error` fields.

## Distinguish domain primitives

Use branded or opaque types when two values share a runtime representation but
are not interchangeable, such as `UserId` and `OrderId`. Construct these values
only after validation. Do not brand every primitive by default; use a distinct
type when confusing the values would create a real defect.

## Require exhaustive handling

Structure branching over unions and enums so the compiler reports an error when
a new variant is not handled. In TypeScript, narrow the remaining value to
`never` in the fallback branch.

## Do not bypass the checker

Treat `any`, unchecked type assertions, and lying type guards as defects. Receive
untrusted values as `unknown`, validate them at the boundary, and convert them
to trusted domain types. When an assertion is unavoidable, keep it adjacent to
the validation that justifies it.

For where validation belongs and how trusted types move through the program,
follow [boundary discipline](boundary-discipline.md).
