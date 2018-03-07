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
printf "SETTING containerId=`docker images -a | grep "$tagName" | awk NR==1'{print $3'}`\n\n"
containerId=`docker images -a | grep "$tagName" | awk NR==1'{print $3'}`

# containerId=`docker images -a | grep "cpsc310__" | awk NR==1'{print $3'}` // gets course base image id

# #2. search for running images on tag and log them
# printf "docker ps -a | grep "$containerId"\n\n"
# docker ps -a | grep "$containerId"

# #3. Grab running image tags
# printf "runningImages=`docker ps -a | grep ${containerId} | awk '{print $1}' | xargs`\n\n"
# runningImages=`docker ps -a | grep ${containerId} | awk '{print $1}' | xargs`

# #4. Stop running image tags
# printf "docker stop $runningImages"

# docker stop $runningImages


# # COMMENTED OUT AS HAVE TO FIND A WAY TO GRACEFULLY BUT REDUNDANTLY INCLUDE
# # THIS LINE WITHOUT THROWING AN ERROR.
# # #5. Kill running images that are not stopped.
# # printf "docker kill $runningImages\n\n"
# # docker kill $runningImages

# #6. Remove stopped and killed containers
# printf "docker rm -f $runningImages\n\n"
# docker rm -f $runningImages

#6. Finally, remove image tag from original container ID and delete container ID
printf "RUNNING docker rmi "$tagName"\n\n"
docker rmi -f "$tagName"

printf "RUNNING docker rmi $containerId\n\n"
docker rmi -f $containerId
