#!/usr/bin/env bash

# ##############################################################################
#
# Description:
# Destroys a Docker image by force-quitting the running containers and then running RMI.
#
# Parameters:
# $1: Docker image tag name to drop. Should match format: 'autotest/cpsc310__d2__bootstrap'.
#
# Example:
#  ./docker-destroy-helper.sh autotest/cpsc410__bootstrap
# ##############################################################################

tagName=${1}

#1. Get container ID based on tag name 
containerId=`docker images -a | grep "$tagName" | awk NR==1'{print $3'}`

containerId=`docker images -a | grep "cpsc310__" | awk NR==1'{print $3'}`

#2. search for running images on tag and log them
docker ps -a | grep "$containerId"

#3. Grab running image tags
runningImages=`docker ps -a | grep 12282e031c81 | awk '{print $1}' | xargs`

#4. Stop running image tags
docker stop $runningImages

#5. Kill running images that are not stopped.
docker kill $runningImages

#6. Remove stopped and killed containers
docker rm -f $runningImages

#6. Finally, remove image tag from original container ID and delete container ID
docker rmi "$tagName"
docker rmi $containerId
