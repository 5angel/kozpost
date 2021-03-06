export default class MainCtrl {
    constructor($http) {
        this._timeout  = false;
        this._previous = '';

        this.loading = false;

        this.message = this._getBlankMessage();

        this.typographyfy = false;

        var cache = localStorage.getItem(MainCtrl.CACHE);

        if (cache) {
            var parsed = JSON.parse(cache);

            this.token = parsed.token;
            this.user  = parsed.user;

            this.message.chat_id = parsed.channel || '';
            this.message.message_id = parsed.target || null;
            this.message.text = parsed.text;
        } else {
            this.token = '';
            this.user  = null;
        }

        this.error = false;

        this.result = null;

        this._postForm = this.__postFormPartial.bind(this, $http);

        this.login = this.__loginPartial.bind(this, $http);
    }

    _getBlankMessage() {
        return {
            message_id: null,
            chat_id: '',
            text: '',
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
            disable_notification: false
        };
    }

    _typographyphy(str) {
        return str.replace(/"(.+)"/g, '«$1»').replace(/\s-\s/g, ' – ');
    }

    _serialize(data) {
        if (!angular.isObject(data)) {
            return data === null ? '' : data.toString();
        }

        let buffer = [],
            config = this.getMdConfig();

        for (const name in data) {
            if (!data.hasOwnProperty(name) || data[name] === null) {
                continue;
            }

            let value = data[name];

            switch (name) {
                case 'text':
                    if (config.typographyfy) {
                        value = this._typographyphy(value);
                    }
                    break;
                default:
                    break;
            }

            buffer.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
        }

        return buffer.join('&').replace(/%20/g, '+');
    }

    _getUrl(method) {
        if (!angular.isString(method) || method === '') {
            throw new TypeErorr('provide a method');
        }

        return MainCtrl.API + this.token + '/' + method;
    }

    _onLogin(data) {
        this.user = data.result;

        this._updateCache({
            token: this.token,
            user:  this.user
        });
    }

    _updateCache(obj) {
        this._timeout = false;

        var cache = JSON.parse(localStorage.getItem(MainCtrl.CACHE) || '{}');

        for (const name in obj) {
            if (!obj.hasOwnProperty(name)) {
                continue;
            }

            cache[name] = obj[name];
        }

        localStorage.setItem(MainCtrl.CACHE, JSON.stringify(cache));
    }

    _onPublished(data) {
        let published = this.isPublished();

        if (!published) {
            this._previous = this.message.text;

            this.message.message_id = data.result.message_id;

            this._updateCache({
                channel: this.message.chat_id,
                target:  this.message.message_id
            });
        }

        this.result = {
            success: true,
            title: !published ? 'Post successful!' : 'Edit successful!'
        };
    }

    __loginPartial($http) {
        this.loading = true;

        $http.get(this._getUrl('getMe'))
            .success(this._onLogin.bind(this))
            .error(() => this.error = true)
            .finally(() => this.loading = false);
    }

    __postFormPartial($http, method, data) {
        return $http({
            method: 'POST',
            url:  this._getUrl(method),
            data: this._serialize(data),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    onChangeChannel() {
        this.message.message_id = null;
    }

    isPublished() {
        return this.message.message_id !== null;
    }

    isSame() {
        return this.isPublished() && angular.equals(this.message.text, this._previous);
    }

    getMdConfig() {
        return {
            typographyfy: this.typographyfy
        };
    }

    clear() {
        this._previous = '';

        this.message.message_id = null;
        this.message.text = '';

        this._updateCache({
            target: null,
            text: ''
        });
    }

    backup() {
        if (!this._timeout) {
            this._timeout = true;

            setTimeout(() => this._updateCache({
                text: this.message.text
            }), 1000);
        }
    }

    logout() {
        this.token = '';
        this.user  = null;
        this.message = this._getBlankMessage();
        localStorage.removeItem(MainCtrl.CACHE);
    }

    send() {
        this.loading = true;

        let method = this.isPublished() ? 'editMessageText' : 'sendMessage';

        this._postForm(method, this.message)
            .success(this._onPublished.bind(this))
            .error(() => this.result = {
                success: false,
                title: 'Post failed!',
                text: 'Check if the channel exists & your bot is added as an administrator'
            })
            .finally(() => this.loading = false);
    }
}

MainCtrl.$inject = ['$http'];

MainCtrl.CACHE = 'kozpost:cache';
MainCtrl.API   = 'https://api.telegram.org/bot';
