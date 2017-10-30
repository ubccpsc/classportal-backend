# Batch Functions

This directory contains a set of files useful for performing batch functions, but for which no UI exists. Each file will generally perform a single task. These will require a properly setup `.env` file to enable proper access to the backend etc.

## `DataExporter`

Sometimes it is necessary to dump a table from the database for more extensive offline analysis. The command to execute is below, all arguments are required:

`node build/app/batch/DataExporter <orgName> <tableName> <outputFileName>` 
