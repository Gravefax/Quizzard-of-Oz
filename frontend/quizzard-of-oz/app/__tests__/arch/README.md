Code Organization. Let’s say you have a team agreement that states, “All repositories must exist within a package that ends with the name .repository”

Static coupling/dependencies between the different elements of your program, such as functions, types, packages, modules, components, libraries and frameworks. You can test things like cyclic dependencies, dependence on third-parties, proper use of anti-corruption layers, etc.

Architectural style. Your team might have agreed on some layered architect, maybe you’re using the ports and adapters.

Cross-cutting concerns. You might want to enforce that ‘Services’ within your codebase are properly annotated with @Secured or that all the public methods in Services log at least once.