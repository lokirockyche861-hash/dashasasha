import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler((event) => {
    let uid = getCookie(event, 'uid')
    if (!uid) {
        uid = uuidv4()
        setCookie(event, 'uid', uid, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 365 // 1 year
        })
    }
    event.context.uid = uid
})
