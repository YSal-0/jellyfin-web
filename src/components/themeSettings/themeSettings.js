import escapeHtml from 'escape-html';
// import browser from '../../scripts/browser';
// import layoutManager from '../layoutManager';
// import { pluginManager } from '../pluginManager';
// import { appHost } from '../apphost';
import focusManager from '../focusManager';
// import datetime from '../../scripts/datetime';
import globalize from '../../lib/globalize';
import loading from '../loading/loading';
import skinManager from '../../scripts/themeManager';
//import { PluginType } from '../../types/plugin.ts';
//import Events from '../../utils/events.ts';
import { Events } from 'jellyfin-apiclient';
import '../../elements/emby-select/emby-select';
import '../../elements/emby-checkbox/emby-checkbox';
import '../../elements/emby-button/emby-button';
import '../../elements/emby-textarea/emby-textarea';
import ServerConnections from '../ServerConnections';
import toast from '../toast/toast';
import template from './themeSettings.template.html';

/* eslint-disable indent */

function fillThemes(select, selectedTheme) {
    skinManager.getThemes().then(themes => {
        select.innerHTML = themes.map(t => {
            return `<option value="${t.id}">${escapeHtml(t.name)}</option>`;
        }).join('');

        // get default theme
        const defaultTheme = themes.find(theme => theme.default);

        // set the current theme
        select.value = selectedTheme || defaultTheme.id;
    });
}

function loadForm(context, user, userSettings) {
    fillThemes(context.querySelector('#selectTheme'), userSettings.theme());
    context.querySelector('#chkBackdrops').checked = userSettings.enableBackdrops();

    loading.hide();
}

function saveUser(context, user, userSettingsInstance, apiClient) {
    userSettingsInstance.theme(context.querySelector('#selectTheme').value);
    userSettingsInstance.enableBackdrops(context.querySelector('#chkBackdrops').checked);

    if (user.Id === apiClient.getCurrentUserId()) {
        skinManager.setTheme(userSettingsInstance.theme());
    }

    return apiClient.updateUserConfiguration(user.Id, user.Configuration);
}

function save(instance, context, userId, userSettings, apiClient, enableSaveConfirmation) {
    loading.show();

    apiClient.getUser(userId).then(user => {
        saveUser(context, user, userSettings, apiClient).then(() => {
            loading.hide();
            if (enableSaveConfirmation) {
                toast(globalize.translate('SettingsSaved'));
            }
            Events.trigger(instance, 'saved');
        }, () => {
            loading.hide();
        });
    });
}

function onSubmit(e) {
    const self = this;
    const apiClient = ServerConnections.getApiClient(self.options.serverId);
    const userId = self.options.userId;
    const userSettings = self.options.userSettings;

    userSettings.setUserInfo(userId, apiClient).then(() => {
        const enableSaveConfirmation = self.options.enableSaveConfirmation;
        save(self, self.options.element, userId, userSettings, apiClient, enableSaveConfirmation);
    });

    // Disable default form submission
    if (e) {
        e.preventDefault();
    }
    return false;
}

function embed(options, self) {
    options.element.innerHTML = globalize.translateHtml(template, 'core');
    options.element.querySelector('form').addEventListener('submit', onSubmit.bind(self));
    if (options.enableSaveButton) {
        options.element.querySelector('.btnSave').classList.remove('hide');
    }
    self.loadData(options.autoFocus);
}

class ThemeSettings {
    constructor(options) {
        this.options = options;
        embed(options, this);
    }

    loadData(autoFocus) {
        const self = this;
        const context = self.options.element;

        loading.show();

        const userId = self.options.userId;
        const apiClient = ServerConnections.getApiClient(self.options.serverId);
        const userSettings = self.options.userSettings;

        return apiClient.getUser(userId).then(user => {
            return userSettings.setUserInfo(userId, apiClient).then(() => {
                self.dataLoaded = true;
                loadForm(context, user, userSettings);
                if (autoFocus) {
                    focusManager.autoFocus(context);
                }
            });
        });
    }

    submit() {
        onSubmit.call(this);
    }

    destroy() {
        this.options = null;
    }
}

/* eslint-enable indent */
export default ThemeSettings;
