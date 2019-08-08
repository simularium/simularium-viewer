pipeline {
    options {
        disableConcurrentBuilds()
        timeout(time: 1, unit: "HOURS")
    }
    agent {
        node {
            label "node-packages"
        }
    }
    triggers {
        pollSCM("H */4 * * 1-5")
    }
    parameters {
        booleanParam(name: 'PUBLISH', defaultValue: false, description: "Publish to npm-local repository in Artifactory")
    }
    stages {
        stage ("node and npm setup") {
            steps {
                this.notifyBB("INPROGRESS")
                sh "./gradlew npmInstall"
            }
        }
        stage ("lint, type check, and test") {
            steps {
                sh "./gradlew lint"
                sh "./gradlew typeCheck"
                sh "./gradlew test"
            }
        }
        stage ("build and publish") {
            when {
                expression {
                    return params.PUBLISH
                }
            }
            steps {
                sh "./gradlew build"
                sh "./gradlew npm_publish"
            }
        }
    }
    post {
        always {
            this.notifyBB(currentBuild.result)
        }
        cleanup {
            deleteDir()
        }
    }
}

def notifyBB(String state) {
    // on success, result is null
    state = state ?: "SUCCESS"

    if (state == "SUCCESS" || state == "FAILURE") {
        currentBuild.result = state
    }

    notifyBitbucket commitSha1: "${GIT_COMMIT}",
            credentialsId: "aea50792-dda8-40e4-a683-79e8c83e72a6",
            disableInprogressNotification: false,
            considerUnstableAsSuccess: true,
            ignoreUnverifiedSSLPeer: false,
            includeBuildNumberInKey: false,
            prependParentProjectKey: false,
            projectKey: "SW",
            stashServerBaseUrl: "https://aicsbitbucket.corp.alleninstitute.org"
}