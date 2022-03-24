import { Settings } from "./settings"

enum Config {
    Timeout = 5000,
}

export class JiraClient {
    private _settings: Settings

    constructor(settings: Settings) {
        this._settings = settings
    }

    async fetchWithTimeout(resource, options) {
        const { timeout = Config.Timeout } = options

        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        })
        clearTimeout(id)

        return response
    }

    async getIssue(issue: string): Promise<any> {
        const url: URL = new URL(this._settings.get('jiraHost') + this._settings.apiBasePath + '/issue/' + issue)
        const requestHeaders: HeadersInit = new Headers
        if (this._settings.get('username')) {
            requestHeaders.set('Authorization', 'Basic ' + btoa(this._settings.get('username') + ':' + this._settings.get('password')))
        } else if (this._settings.get('password')) {
            requestHeaders.set('Authorization', 'Bearer ' + this._settings.get('password'))
        }
        const options: RequestInit = {
            method: 'GET',
            headers: requestHeaders,
        }

        let response: Response
        try {
            response = await this.fetchWithTimeout(url.toString(), options)
        } catch (e) {
            console.error('JiraClient::getIssue::response', e.name, e)
            if (e.name === 'AbortError') {
                throw 'Request timeout'
            }
            throw 'Request error'
        }

        if (response.status === 200) {
            // console.info('response', response)
            try {
                return response.json()
            } catch (e) {
                console.error('JiraClient::getIssue::parsing', response, e)
                throw 'The API response is not a JSON. Please check the host configured in the plugin options.'
            }
        } else {
            console.error('JiraClient::getIssue::error', response)
            let responseJson: any
            try {
                responseJson = await response.json()
            } catch (e) {
                throw 'HTTP status ' + response.status
            }
            throw responseJson['errorMessages'].join('\n')
        }
    }

    async getSearchResults(query: string, max: number): Promise<any> {
        const url: URL = new URL(this._settings.get('jiraHost') + this._settings.apiBasePath + '/search')
        const requestHeaders: HeadersInit = new Headers
        if (this._settings.get('username')) {
            requestHeaders.set('Authorization', 'Basic ' + btoa(this._settings.get('username') + ':' + this._settings.get('password')))
        } else if (this._settings.get('password')) {
            requestHeaders.set('Authorization', 'Bearer ' + this._settings.get('password'))
        }
        const queryParameters = new URLSearchParams({
            jql: query,
            startAt: "0",
            maxResults: max.toString(),
        })
        url.search = queryParameters.toString()
        const options: RequestInit = {
            method: 'GET',
            headers: requestHeaders,
        }

        let response: Response
        try {
            response = await this.fetchWithTimeout(url.toString(), options)
        } catch (e) {
            console.error('JiraClient::getSearchResults::response', e.name, e)
            if (e.name === 'AbortError') {
                throw 'Request timeout'
            }
            throw 'Request error'
        }

        if (response.status === 200) {
            // console.info('response', response)
            try {
                return response.json()
            } catch (e) {
                console.error('JiraClient::getSearchResults::parsing', response, e)
                throw 'The API response is not a JSON. Please check the host configured in the plugin options.'
            }
        } else {
            console.error('JiraClient::getSearchResults::error', response, await response.text())
            let responseJson: any
            try {
                responseJson = await response.json()
            } catch (e) {
                throw 'HTTP status ' + response.status
            }
            throw responseJson['errorMessages'].join('\n')
        }
    }

    async updateStatusColorCache(status: string): Promise<void> {
        // Check cached status
        if (this._settings.isStatusColorCached(status)) {
            return
        }

        // Request the status color using the API
        const url: URL = new URL(this._settings.get('jiraHost') + this._settings.apiBasePath + '/status/' + status)
        const requestHeaders: HeadersInit = new Headers
        if (this._settings.get('username')) {
            requestHeaders.set('Authorization', 'Basic ' + btoa(this._settings.get('username') + ':' + this._settings.get('password')))
        } else if (this._settings.get('password')) {
            requestHeaders.set('Authorization', 'Bearer ' + this._settings.get('password'))
        }
        const options: RequestInit = {
            method: 'GET',
            headers: requestHeaders,
        }

        let response: Response
        try {
            response = await this.fetchWithTimeout(url.toString(), options)
        } catch (e) {
            console.error('JiraClient::getIssue::response', e.name, e)
            if (e.name === 'AbortError') {
                throw 'Request timeout'
            }
            throw 'Request error'
        }

        if (response.status === 200) {
            // console.info('response', response)
            try {
                const responseJson = await response.json()
                this._settings.addStatusColor(status, responseJson.statusCategory.colorName)
                return
            } catch (e) {
                console.error('JiraClient::getIssue::parsing', response, e)
                throw 'The API response is not a JSON. Please check the host configured in the plugin options.'
            }
        } else {
            console.error('JiraClient::getIssue::error', response)
            let responseJson: any
            try {
                responseJson = await response.json()
            } catch (e) {
                throw 'HTTP status ' + response.status
            }
            throw responseJson['errorMessages'].join('\n')
        }
    }
}
