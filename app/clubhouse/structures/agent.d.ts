import fetch from 'cross-fetch'
import { Profile } from '../profiles/index.js'

declare function agent (url: string, options: any, customs: Profile): ReturnType<typeof fetch>
export default agent
