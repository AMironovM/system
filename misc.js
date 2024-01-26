const apiServer = 'https://api.kupay.ru/system_api/hs/api/'
import { user, settings, visitorId, sessionId, localStorageId } from './graph.js'

export const getJSON = async url => {
    const response = await fetch(url)
    const text = await response.text()
    return JSON.parse(text, reviveDate);
}

export function fitText(outputDiv) {

    const width = outputDiv.clientWidth;
    const contentWidth = outputDiv.scrollWidth;
    let fontSize = parseInt(window.getComputedStyle(outputDiv, null).getPropertyValue('font-size'), 10);

    if (contentWidth > width) {
        fontSize = Math.ceil(fontSize * width / contentWidth, 10);
        fontSize = fontSize > 50 ? fontSize = 50 : fontSize - 1;
        outputDiv.style.fontSize = fontSize + 'px';
    }
}

function reviveDate(key, value) {
    // Matches strings like "2022-08-25T09:39:19.288Z"
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
    return typeof value === 'string' && isoDateRegex.test(value)
        ? new Date(value)
        : value
}

export const postJSON = async (endPoint, data) => {
    const payload = { ...data, sessionInfo: { visitorId, sessionId, localStorageId, userDrawnId: settings.userDrawnId } }
    const response = await fetch(apiServer + endPoint, { method: "POST", body: JSON.stringify(payload) });
    const text = await response.text()
    return JSON.parse(text, reviveDate);
}

export const log = async data => {
    if (!visitorId) {
        setTimeout(log, 2000, data)
        return
    }
    postJSON('addEvent', { fingerprint: visitorId, sessionId, localStorageId, userId: user.id, userDrawnId: settings.userDrawnId, ...data })
}

export function timer(ms) {
    if (ms < 1) {
        ms = 1
    }
    return new Promise(res => setTimeout(res, ms));
}

export function getVectorCoordinates(angle, length, center = { x: 0, y: 0 }) {

    angle = angle * (Math.PI / 180);
    const x = Math.sin(angle) * length;
    const y = Math.cos(angle) * length * - 1

    return ({ x: x + center.x, y: y + center.y })

}

export function getAngle(x, y, center = { x: 0, y: 0 }) {

    x -= center.x
    y -= center.y

    y *= -1

    y = y === -0 ? 0 : y

    const distance = Math.sqrt(x ** 2 + y ** 2)
    const rad = Math.acos(y / distance)
    let angle = rad * 180 / Math.PI;

    if (x < 0) {
        angle = 360 - angle;
    }

    return ({ angle, distance })
}

export function getUserInfoByKey(key) {

    return user
}

export function createCookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    }
    else var expires = "";
    document.cookie = name + "=" + value + expires + "; path=/";
}

export function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function eraseCookie(name) {
    createCookie(name, "", -1);
}

export function getAliasPresentation(object, fieldName, useNicknames) {
    const capitalizezFieldName = fieldName[0].toUpperCase() + fieldName.slice(1)
    const aliasField = object['alias' + capitalizezFieldName]
    const fullField = object[fieldName]
    const aliasPresentation = useNicknames ? (aliasField) : (fieldName in object ? fullField : aliasField)
    return (aliasPresentation)
}