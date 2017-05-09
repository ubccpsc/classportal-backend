May 4, 2017
------------

Installation of:

- Node v6.10.3 LTS 
 { 1) sudo curl -sL https://rpm.nodesource.com/setup_6.x | sudo -E bash -
   2) sudo yum install nodejs.x86_64
 }
- Yarn 0.23.4-1
 { 1) sudo wget https://dl.yarnpkg.com/rpm/yarn.repo -O /etc/yum.repos.d/yarn.repo
   2) sudo yum install yarn
 }
- MongoDB & Mongod client
 { 1) sudo nano /etc/yum.repos.d/mongodb-org.repo  
     
    Paste contents:

	[mongodb-org-3.4]
	name=MongoDB Repository
	baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/3.4/x86_64/
	gpgcheck=1
	enabled=1
	gpgkey=https://www.mongodb.org/static/pgp/server-3.4.asc

   2) sudo yum install mongodb-org-server.x86_64 
   3) sudo systemctl start mongod
  }
