# ClassPortal API

Internal REST API for [ClassPortal][classportal].

Built with [Node.js][nodejs], [TypeScript][typescript], [Restify][restify], and [Mongoose][mongoose].

## Table of Contents  

* [High-level App Summary](#high-level-app-summary)
* [DB Dependency Logic](#dependency-logic)
* [Bootstrapping Instructions](#bootstrapping-instructions)
* [Contribute](#contribute)

<a name="high-level-app-summary"/>
## High Level App Summary

<a name="dependency-logic"/>
## DB Dependency Logic

1) A SuperAdmin user must be created on the basis of the `SuperAdmin` username in the 
.env file. The username must match the Github login username.
