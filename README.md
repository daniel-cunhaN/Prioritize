1-Rodar esse comando no terminal powershell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

2-Na pasta do projeto, para dar setup do backend, no terminal, rodar:
cd backend
python -m venv venv
venv/scripts/activate
pip install -r requirements.txt
alembic upgrade head
deactivate
cd ..

3-Na pasta raiz do projeto, para dar setup ao frontend, no terminal, rodar:
cd frontend
npm install
npm install expo
npx expo install react-dom react-native-web @expo/metro-runtime
npm install @expo/metro-runtime



