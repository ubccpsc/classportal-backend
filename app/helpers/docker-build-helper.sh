#!/usr/bin/env bash

# ##############################################################################
# 
# Based on Nick Bradley's original script <nbrad11@cs.ubc.ca>
#
# Description:
# Builds a Docker container for a Course or Deliverable to work with AutoTest.
#
# Parameters:
# $1: Temporary Dockerfile path where ClassPortal-Backend has cloned the stakeholder's Dockerfile repository.
#
# $2: A GitHub API key that has access to organizations on Github to access student repos.
#
# $3: The courseId that will be used to tag the image.
#
# $4: The deliverable that will be used to tag the image and inserted into the image as an 
# environment variable.
# 
# $5: Boolean on whether the container is being built on the Production or Testing/Development server;
#      1 for if in Production.
#
# $6: Course API path with port. ie. https://portal.cs.ubc.ca:1210/
#
# Example:
#  ./docker-build-helper.sh af345rt3tt14636d1779g0452c47g25cd4ad75bce 210 d9 d1 1
# ##############################################################################

set -o errexit  # exit on command failure
set -o pipefail # exit if any command in pipeline fails
set -o nounset  # exit if undeclared variable is used

dockerFilePath=${1}
githubKey=${2}
courseId=${3}
deliverable=${4}
isContainerLive=${5}
courseAPI={$6}

dockerDir=${1}

if [[ "$deliverable" != "0" ]]
then
  tagName=autotest/cpsc${courseId}__${deliverable}__bootstrap:master
  printf "docker-build-helper.sh:: Building Docker image for Deliverable ${deliverable}\n\n"
else
  tagName=autotest/cpsc${courseId}__bootstrap:master
  printf "docker-build-helper.sh:: Building Docker image for Course ${courseId}\n\n"
fi

printf "docker build -f ${dockerFilePath}/Dockerfile --tag ${tagName} \
 --build-arg isContainerLive="${isContainerLive}" \
 --build-arg deliverable="${deliverable}" \
 --build-arg githubKey="${githubKey}" \
 --no-cache \
 "${dockerDir}"\n\n"

docker build -f ${dockerFilePath}/Dockerfile --tag ${tagName} \
 --build-arg isContainerLive="${isContainerLive}" \
 --build-arg deliverable="${deliverable}" \
 --build-arg githubKey="${githubKey}" \
 --no-cache \
 "${dockerDir}"

if [[ "$deliverable" != "0" ]]
then
  docker tag ${tagName} autotest/cpsc${courseId}__${deliverable}__bootstrap
else
  docker tag $(docker images -q autotest/cpsc${courseId}__${deliverable}__bootstrap:master) autotest/cpsc${courseId}__bootstrap
fi


