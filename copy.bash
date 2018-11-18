#!/bin/bash

cp server1.js server2.js
cp server1.js server3.js

sed -i -e 's/3000/3001/g' server2.js
sed -i -e 's/8000/8001/g' server2.js
sed -i -e 's/9000/9001/g' server2.js
sed -i -e 's/nodeInfo.name = "server1"/nodeInfo.name = "server2"/g' server2.js
sed -i -e 's/nodeInfo.wealth = 5/nodeInfo.wealth = 10/g' server2.js

sed -i -e 's/3000/3002/g' server3.js
sed -i -e 's/8000/8002/g' server3.js
sed -i -e 's/9000/9002/g' server3.js
sed -i -e 's/nodeInfo.name = "server1"/nodeInfo.name = "server3"/g' server3.js
sed -i -e 's/nodeInfo.wealth = 5/nodeInfo.wealth = 5/g' server3.js

