// CI/CD конвейер: тесты -> сборка образов -> публикация -> развёртывание в Kubernetes
pipeline {
  agent any

  environment {
    REGISTRY = credentials('docker-registry-url')   // например registry.example.ru/foodflow
    TAG = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Тесты и сборка TypeScript') {
      parallel {
        stage('users')       { steps { dir('services/users-service')       { sh 'npm ci && npm run build' } } }
        stage('restaurants') { steps { dir('services/restaurants-service') { sh 'npm ci && npm run build' } } }
        stage('orders')      { steps { dir('services/orders-service')      { sh 'npm ci && npm test && npm run build' } } }
        stage('delivery')    { steps { dir('services/delivery-service')    { sh 'npm ci && npm run build' } } }
        stage('gateway')     { steps { dir('gateway')                      { sh 'npm ci && npm run build' } } }
        stage('client')      { steps { dir('client')                       { sh 'npm ci && npm run build' } } }
      }
    }

    stage('Сборка Docker-образов') {
      steps {
        script {
          def images = [
            'users-service': 'services/users-service',
            'restaurants-service': 'services/restaurants-service',
            'orders-service': 'services/orders-service',
            'delivery-service': 'services/delivery-service',
            'gateway': 'gateway',
            'client': 'client',
          ]
          images.each { name, path ->
            sh "docker build -t ${REGISTRY}/${name}:${TAG} -t ${REGISTRY}/${name}:latest ${path}"
          }
        }
      }
    }

    stage('Публикация образов') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login -u "$U" --password-stdin ${REGISTRY%%/*}'
          sh 'for i in users-service restaurants-service orders-service delivery-service gateway client; do docker push ${REGISTRY}/$i:${TAG}; docker push ${REGISTRY}/$i:latest; done'
        }
      }
    }

    stage('Развёртывание в Kubernetes') {
      when { branch 'main' }
      steps {
        withKubeConfig([credentialsId: 'kubeconfig']) {
          sh 'kubectl apply -f k8s/'
          sh 'for i in users-service restaurants-service orders-service delivery-service gateway client; do kubectl -n foodflow set image deployment/$i $i=${REGISTRY}/$i:${TAG}; done'
          sh 'kubectl -n foodflow rollout status deployment/gateway --timeout=180s'
        }
      }
    }
  }

  post {
    failure { echo 'Сборка упала, развёртывание не выполнялось' }
  }
}
