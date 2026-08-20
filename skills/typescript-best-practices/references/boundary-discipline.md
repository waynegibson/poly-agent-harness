# Boundary discipline

Concentrate parsing, validation, representation mapping, and external error
translation at system boundaries. Keep the typed business core free from
framework wiring and repeated defensive checks.

## Guard the gates

Treat network payloads, CLI arguments, environment variables, configuration
files, database results, persisted data, and third-party SDK values as
untrusted. Accept them as `unknown` or their generated wire type, then validate
and narrow them immediately. Use a schema library when it makes that validation
clearer and reusable.

## Convert to domain concepts

Map external representations into domain types at the boundary. Do not let API,
database, or framework-specific shapes leak through the core merely because
they happen to resemble the domain model.

## Trust the typed core

Once a value has crossed a validated boundary, internal functions should trust
its domain type. Do not re-parse it throughout the call graph or add impossible
error branches "just in case." Add another validation step only where the value
crosses a new trust boundary or an invariant cannot be represented statically.

## Keep business logic pure

Separate decisions and transformations from I/O. Put network, storage,
framework, and process concerns in thin adapters around pure domain functions.
Tests can then exercise the important behavior directly without constructing or
mocking an entire external framework.

Use [type-system discipline](type-system-discipline.md) to ensure that the domain
types produced at the boundary carry the invariants the core relies on.
