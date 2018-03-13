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

# DECLARED BASH METHODS
stopRunningContainers() {
  printf "2d. STOP RUNNING CONTAINERS: ${runningImages}\n"
  printf "    STOPPED LIST:\n"
  docker stop ${runningImages}
}

# If running images has lenght greater than 0; THEN
checkForRunningContainers() {
  if [ ${#runningImages} -gt 0 ]
  then 
    echo "2c. NO RUNNING CONTAINERS FOUND"
  else 
    echo "2c. RUNNING CONTAINERS FOUND"
    stopRunningContainers
  fi
}

# SCRIPT START

#1. Get container ID based on tag name 
printf "\n\n1. FINDING IMAGE TO DESTROY BASED ON TAG NAME:\n"
printf "containerId=`docker images -a | grep "$tagName" | awk NR==1'{print $3'}`"
containerId=`docker images -a | grep "$tagName" | awk NR==1'{print $3'}`

#2a. GRAB RUNNING IMAGE TAGS. 
printf "\n\n2a. GRAB RUNNING IMAGE TAGS:\n"
printf "runningImages=`docker ps -a | grep ${containerId} | awk '{print $1}' | xargs`"
runningImages=`docker ps -a | grep ${containerId} | awk '{print $1}' | xargs`

#2b. CONFIRM IF CONTAINERS RUNNING; KILL RUNNING CONTAINERS
printf "\n\n2b. CHECKING FOR RUNNING CONTAINERS\n"
checkForRunningContainers

#3. REMOVE CONTAINER ID
printf "\n3. REMOVING BUILD IMAGE ID\n"
printf "docker rmi "$containerId"\n\n"
docker rmi -f "$containerId"

