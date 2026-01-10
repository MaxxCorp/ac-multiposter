if [ ! -d "node_modules" ]; then
    npm install
fi

if [ ! -f ".env.local" ]; then
    cp docker/docker-env .env.local
fi

npm run docker-dev