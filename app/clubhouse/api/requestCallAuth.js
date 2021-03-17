import agent from '../structures/agent.js'

const requestCallAuth = async (profile, phoneNumber) => {
  'use strict'

  const response = await agent('/call_phone_number_auth', {
    body: {
      phone_number: phoneNumber // NOTE: +(Nation)(Numbers) e.g. Korean 010 1234 5678 -> +821012345678
    }
  }, profile)
  const data = await response.json()

  return data
}

export default requestCallAuth

export const specification = {
  success: Boolean,
  is_blocked: Boolean,
  error_message: String
}
