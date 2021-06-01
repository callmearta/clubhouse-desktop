const ClubHouseApi = require("clubhouse-api");
const store = require("store");
const uuid = require("uuid");
const PubNub = require("pubnub");
const toastr = require("toastr");
// const AgoraRTM = require('agora-rtm-sdk');

// let rtmClient = null;

AgoraRTC.Logger.setLogLevel(4);

let client = null;
let pubnub = null;
let stream = null;

function isLatinString(s) {
	if (s) {
		if (
			s.match(
				/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/
			)
		) {
			return false;
		} else {
			return true;
		}
	} else {
		return true;
	}
}

const Channel = {
	mounted: function() {
		if (this.userData) {
			this.reqProfile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: this.userData.user_profile.user_id,
				token: this.userData.auth_token
			};
		}
		this.getChannel();
		this.getMe();
		this.getOnlineFriends();
		this.getChannels();
	},
	props: ["name"],
	data: function() {
		return {
			channel: {},
			users: [],
			loading: true,
			isSpeaker: false,
			userData: store.get("userData"),
			handRaised: false,
			activePingInterval: null,
			isModerator: false,
			streams: [],
			userData: store.get("userData"),
			reqProfile: null,
			eventsResult: null,
			events: [],
			eventsLoading: true,
			channelsResult: null,
			channels: [],
			channelsLoading: true,
			loading: false,
			retry: 0,
			channelsInterval: null,
			searchQuery: "",
			newRoom: {
				modalVisible: false,
				topic: ""
			},
			myProfile: null,
			newInvite: {
				modalVisible: false,
				phone: "",
				name: ""
			},
			onlineFriends: null,
			onlineFriendsLoading: true,
			onlineFriendsInterval: null,
			newRoomFriends: [],
			newRoomType: null
		};
	},
	beforeDestroy: function() {
		// this.leave();
		console.log("beforeDestroy Channel.");
		clearInterval(this.activePingInterval);
		this.activePingInterval = null;
		clearInterval(this.onlineFriendsInterval);
		this.onlineFriendsInterval = null;
		clearInterval(this.channelsInterval);
		this.channelsInterval = null;
		if (pubnub) {
			pubnub.unsubscribeAll();
			pubnub = null;
		}
	},
	methods: {
		activePing: async function() {
			const userData = store.get("userData");
			const profiles = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.activePing(profiles, this.name);
			//console.log(result);
		},
		getChannel: async function() {
			const $this = this;
			const userData = store.get("userData");
			const profiles = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};

			const result = await ClubHouseApi.api.joinChannel(profiles, {
				channel: this.name
			});
			////console.log(result);
			if (result.success) {
				this.channel = result;
				// if(this.users.length){
				//     result.users.map(user => {
				//         const userIndex = this.users.findIndex(u => u && u.user_id == user.user_id);
				//         if(userIndex == -1){
				//             this.$set(this.users,this.users.length,Object.assign({},user));
				//         }
				//     });
				// }else{
				this.users = result.users;
				// }
				this.loading = false;
				const me = result.users.find(
					user => user.user_id == userData.user_profile.user_id
				);
				if (me.is_moderator) {
					this.isModerator = true;
					this.isSpeaker = true;
				}
				if (me.is_speaker) {
					this.isSpeaker = true;
				}

				// if(client){
				//     client.leave();
				//     client = null;
				// }
				// if(pubnub){
				//     pubnub.unsubscribeAll();
				//     pubnub = null;
				// }

				if (!pubnub) {
					this.initPubnub();
				}
				// this.initRTM();
				this.initRTC(result);
			} else {
				console.error(result);
				const notif = new Notification("Failed", {
					body: result.error_message
				});
				this.$router.replace({ name: "home" });
			}
			if (!this.activePingInterval) {
				this.activePingInterval = setInterval(function() {
					$this.activePing();
				}, 30000);
			}
		},
		initPubnub: function() {
			const userData = store.get("userData");
			if (!pubnub) {
				pubnub = new PubNub({
					publishKey: ClubHouseApi.profiles.application.a304.pubnubPubKey,
					subscribeKey: ClubHouseApi.profiles.application.a304.pubnubSubKey,
					uuid: userData.user_profile.user_id,
					origin: this.channel.pubnub_origin,
					authKey: this.channel.pubnub_token,
					heartbeatInterval: this.channel.pubnub_heartbeat_interval,
					// logVerbosity: true,
					presenceTimeout: this.channel.pubnub_heartbeat_value
				});
			}
			let channels = [
				`channel_all.${this.channel.channel}`,
				`channel_user.${this.channel.channel}.${userData.user_profile.user_id}`,
				`channel_speakers.${this.channel.channel}`,
				`users.${userData.user_profile.user_id}`
			];
			if (!this.isModerator) {
				delete channels[2];
			}
			pubnub.subscribe({
				channels: channels
			});
			const $this = this;
			pubnub.addListener({
				status: function(statusEvent) {
					//console.log('[pubnub]',statusEvent);
					if (statusEvent.category === "PNConnectedCategory") {
					}
				},
				message: function(messageEvent) {
					//console.log('[pubnub]',messageEvent);
					const act = messageEvent.message.action;
					const msg = messageEvent.message;
					switch (act) {
						case "join_channel":
							$this.addUser(msg.user_profile);
							break;
						case "leave_channel":
							$this.removeUser(msg.user_id);
							break;
						case "end_channel":
							$this.leave();
							break;
						case "remove_speaker":
							$this.removeSpeaker(msg.user_id);
							break;
						case "add_speaker":
							$this.addSpeaker(msg);
							break;
						case "make_moderator":
							$this.makeModerator(msg);
							break;
						case "invite_speaker":
							$this.inviteAsSpeaker(msg);
							break;
						case "raise_hands":
							$this.audienceRaiseHand(msg.user_profile);
							break;
						case "unraise_hands":
							$this.audienceUnraiseHand(msg.user_id);
							break;
					}
				}
			});
		},
		audienceRaiseHand: function(userProfile) {
			const user = this.users.find(
				user => user && user.user_id == userProfile.user_id
			);
			const $this = this;
			if (user) {
				if (
					!document.getElementById(`accept-${userProfile.user_id}`) ||
					!document.getElementById(`accept-${userProfile.user_id}`).length
				) {
					const toast = this.$toastr.Add({
						msg: `${userProfile.name} wants to speak<div class="mt-3"><button class="btn-primary" id="accept-${userProfile.user_id}">Accept</button><button id="reject-${userProfile.user_id}" class="btn-text text-white">Reject</button></div>`,
						title: "✋🏻 Hand Raised",
						timeout: 0,
						name: `toastr-${userProfile.user_id}`,
						type: "info",
						style: { backgroundImage: "none !important" },
						position: "toast-bottom-right",
						clickClose: false,
						onCreated: () => {
							document
								.getElementById(`accept-${userProfile.user_id}`)
								.addEventListener("click", function() {
									$this.inviteSpeaker(userProfile.user_id);
									$this.$toastr.removeByName(`toastr-${userProfile.user_id}`);
								});
							document
								.getElementById(`reject-${userProfile.user_id}`)
								.addEventListener("click", function() {
									$this.$toastr.removeByName(`toastr-${userProfile.user_id}`);
								});
						}
					});
				}
			}
		},
		audienceUnraiseHand: function(userId) {
			const user = this.users.find(user => user.user_id == userId);
			if (document.getElementById(`accept-${userId}`)) {
				document
					.getElementById(`accept-${userId}`)
					.closest(".toast")
					.remove();
			}
		},
		removeSpeaker: function(userId) {
			const userData = store.get("userData");
			const userIndex = this.users.findIndex(u => u && u.user_id == userId);
			this.$set(this.users, userIndex, {
				...this.users[userIndex],
				is_speaker: false,
				is_moderator: false
			});
			if (userId == userData.user_profile.user_id) {
				this.isSpeaker = false;
				this.isModerator = false;
				pubnub.unsubscribe({
					channels: [`channel_speakers.${this.channel.channel}`]
				});
			}
		},
		makeModerator: function(msg) {
			const userData = store.get("userData");
			const userIndex = this.users.findIndex(
				u => u && u.user_id == msg.user_id
			);
			this.$set(this.users, userIndex, {
				...this.users[userIndex],
				is_moderator: true
			});
			if (msg.user_id == userData.user_profile.user_id) {
				this.isModerator = true;
				pubnub.subscribe({
					channels: [`channel_speakers.${this.channel.channel}`]
				});
			}
		},
		addSpeaker: function(msg) {
			const user = msg.user_profile;
			if (user) {
				const userIndex = this.users.findIndex(
					u => u && u.user_id == user.user_id
				);
				if (userIndex > -1) {
					if (user.user_id == this.userData.user_profile.user_id) {
						this.isSpeaker = true;
					}
					this.$set(this.users, userIndex, user);
				} else {
					this.getChannel();
				}
			}
		},
		inviteAsSpeaker: async function(msg) {
			console.log("invite");
			const userData = store.get("userData");
			const profiles = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			////console.log('pubnub:');
			////console.log(msg);
			if (msg.from_name) {
				const c = confirm(msg.from_name + " invited you to join as speaker");
				if (c) {
					const result = await ClubHouseApi.api.acceptSpeakerInvite(
						profiles,
						msg.channel,
						msg.from_user_id
					);
					////console.log(result);
					if (result.success) {
						// this.getChannel();
					} else {
						console.error(result);
						new Notification("Failed");
					}
				}
			}
		},
		addUser: function(user) {
			if (user.user_id) {
				// this.$toastr.Add({
				//     name: `join-${user.user_id}`,
				//     msg: `${user.name} Joined`,
				//     title: '',
				//     type:'info',
				//     timeout:2000,
				//     position: "toast-bottom-right",
				//     style:{backgroundImage:'none !important'}
				// });
			}

			if (
				this.users.findIndex(i => i && user && i.user_id == user.user_id) == -1
			) {
				this.$set(this.users, this.users.length, Object.assign({}, user));
			}
		},
		removeUser: function(userId) {
			const userIndex = this.users.findIndex(
				user => user && user.user_id == userId
			);
			if (userIndex > -1) {
				this.users.splice(userIndex, 1);
			}
		},
		initRTM: async function() {
			const userData = store.get("userData");
			if (!rtmClient) {
				rtmClient = AgoraRTM.createInstance(
					ClubHouseApi.profiles.application.a304.agoraKey
				);
				rtmClient
					.login({
						token: this.channel.rtm_token,
						uid: "" + userData.user_profile.user_id
					})
					.then(
						() => {
							const channel = rtmClient.createChannel(
								"" + this.channel.channel_id
							);
							channel.join().then(e => {
								//console.log(e);
								channel.on("ChannelMessage", ({ text }, senderId) => {
									// text: text of the received channel message; senderId: user ID of the sender.
									//console.log(text,senderId);
								});
							});
							rtmClient.on("MessageFromPeer", ({ text }, peerId) => {
								//console.log(text,peerId);
							});
						},
						err => {
							console.error(err);
						}
					);
			}
		},
		initRTC: async function(result) {
			const userData = store.get("userData");
			let $this = this;
			if (!client) {
				client = AgoraRTC.createClient({ mode: "live", codec: "h264" });
				client.init("938de3e8055e42b281bb8c6f69c21f78");
				client.enableAudioVolumeIndicator(50, 0);

				client.join(
					result.token,
					result.channel,
					userData.user_profile.user_id,
					async uid => {
						stream = AgoraRTC.createStream({
							streamID: uid,
							audio: true,
							video: false,
							microphoneId: (
								await navigator.mediaDevices.enumerateDevices()
							).filter(i => i.kind == "audioinput")[0].deviceId
						});
						stream.setAudioProfile('high_quality_stereo');
						stream.init(() => {
							if (client) {
								stream.enableAudio();
								client.publish(stream, err => console.error(err));
							}
						});
					}
				);
			}
			client.on("stream-published", function(evt) {
				if (client) {
					evt.stream.enableAudio();
					evt.stream.muteAudio();
				}
			});
			client.on("stream-added", async function(evt) {
				$this.subscribeStream(evt);
			});
			client.on("active-speaker", function(evt) {
				const userIndex = $this.users.findIndex(i => i && i.user_id == evt.uid);

				if (userIndex > -1) {
					let newUsers = [...$this.users];
					$this.$set($this.users, userIndex, {
						...newUsers[userIndex],
						speaking: true,
						unmute: true
					});
				}
			});
			client.on("volume-indicator", function(evt) {
				evt.attr.forEach(u => {
					const userIndex = $this.users.findIndex(i => i && i.user_id == u.uid);

					if (userIndex > -1) {
						let newUsers = [...$this.users];
						$this.$set($this.users, userIndex, {
							...newUsers[userIndex],
							speaking: true,
							unmute: true,
							volumeLevel: u.level
						});
					}
				});
			});
			client.on("stream-subscribed", function(evt) {
				let stream = evt.stream;
				client.setRemoteVideoStreamType(evt.stream, 0);
				// const streamExists = $this.streams.findIndex(s => s.getId() == stream.getId());
				// if(streamExists && streamExists.audioContext > -1){
				//     streamExists.audioContext.play();
				// }else{
				// stream.play('app');
				let audio = new Audio();
				audio.srcObject = stream.stream;
				audio.play();
				$this.$set($this.streams, $this.streams.length, {
					...stream,
					audioContext: audio
				});
				// console.log($this.streams);
				// }
			});
			client.on("stream-removed", function(evt) {
				let stream = evt.stream;
				const userIndex = $this.users?.findIndex(
					i => i && i.user_id == stream.getId()
				);

				if (userIndex > -1) {
					let newUsers = [...$this.users];
					$this.$set($this.users, userIndex, {
						...newUsers[userIndex],
						speaking: false
					});
				}

				// stream.stop();
				$this.streams.splice(
					$this.streams.findIndex(s => s.getId() == stream.getId()),
					1
				);
			});
			client.on("mute-audio", function(evt) {
				const userIndex = $this.users?.findIndex(
					i => i && i.user_id == evt.uid
				);
				if (userIndex > -1) {
					let newUsers = [...$this.users];
					$this.$set($this.users, userIndex, {
						...newUsers[userIndex],
						speaking: false,
						unmute: false
					});
				}
			});
			client.on("unmute-audio", function(evt) {
				const userIndex = $this.users?.findIndex(
					i => i && i.user_id == evt.uid
				);
				if (userIndex > -1) {
					let newUsers = [...$this.users];
					$this.$set($this.users, userIndex, {
						...newUsers[userIndex],
						unmute: true
					});
				}
			});
		},
		subscribeStream: function(evt) {
			const $this = this;
			if (client && evt && evt.stream) {
				client.subscribe(evt.stream, { video: false, audio: true }, err => {
					console.error(err);
					return $this.subscribeStream(evt);
				});
			}

			const userIndex = this.users.findIndex(
				i => i && i.user_id == evt.stream.getId()
			);
			if (userIndex > -1 && !this.users[userIndex].speaking) {
				let newUsers = [...this.users];
				this.$set(this.users, userIndex, {
					...newUsers[userIndex],
					speaking: true,
					unmute: true
				});
			}
		},
		leave: async function() {
			const userData = store.get("userData");
			client.leave();
			pubnub.unsubscribeAll();
			const profiles = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.leaveChannel(profiles, this.name);
			client = null;
			pubnub = null;
			if (this.activePingInterval) {
				clearInterval(this.activePingInterval);
			}
			this.$router.replace({ name: "home" });
		},
		mute: function() {
			if (stream) {
				stream.disableAudio();
				stream.muteAudio();
			}
			const userIndex = this.users.findIndex(
				u => u.user_id == this.userData.user_profile.user_id
			);
			if (userIndex > -1) {
				this.$set(this.users, userIndex, {
					...this.users[userIndex],
					unmute: false
				});
			}
		},
		unmute: function() {
			if (stream) {
				stream.enableAudio();
				stream.unmuteAudio();
			}
			const userIndex = this.users.findIndex(
				u => u.user_id == this.userData.user_profile.user_id
			);
			if (userIndex > -1) {
				this.$set(this.users, userIndex, {
					...this.users[userIndex],
					unmute: true
				});
			}
		},
		inviteSpeaker: async function(userId) {
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: this.userData.user_profile.user_id,
				token: this.userData.auth_token
			};
			const result = await ClubHouseApi.api.inviteSpeaker(
				profile,
				this.name,
				userId
			);
			//console.log(result);
			if (result.success) {
			} else {
				new Notification("Failed", {
					body: result.error_message
				});
			}
		},
		handRaise: async function() {
			const profiles = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: this.userData.user_profile.user_id,
				token: this.userData.auth_token
			};
			if (!this.handRaised) {
				const result = await ClubHouseApi.api.audienceReply(
					profiles,
					this.name,
					true,
					false
				);
				////console.log(result);
				if (result.success) {
					this.handRaised = true;
					setTimeout(function() {
						this.handRaised = false;
					}, 10000);
				}
			} else {
				const result = await ClubHouseApi.api.audienceReply(
					profiles,
					this.name,
					false,
					true
				);
				////console.log(result);
				if (result.success) {
					this.handRaised = false;
				}
			}
		},
		getOnlineFriends: async function() {
			const $this = this;
			const result = await ClubHouseApi.api.getOnlineFriends(this.reqProfile);
			console.log(result);
			if (result && result.users) {
				this.onlineFriends = result.users;
				this.onlineFriendsLoading = false;
			} else {
				console.error(result);
			}

			clearInterval(this.onlineFriendsInterval);
			this.onlineFriendsInterval = setInterval(function() {
				$this.getOnlineFriends();
			}, 30000);
		},
		getMe: async function() {
			this.loading = true;
			if (this.userData && this.userData.user_profile) {
				const result = await ClubHouseApi.api.getProfile(this.reqProfile);
				console.log(result);
				if (result.success) {
					this.myProfile = result;
					this.loading = false;
				} else {
					console.error(result);
				}
			}
		},
		getEvents: async function() {
			if (this.userData && this.userData.user_profile) {
				const result = await ClubHouseApi.api.getEvents(this.reqProfile, true);
				console.log(result);
				if (result.success) {
					this.eventsResult = result;
					this.events = result.events;
					this.eventsLoading = false;
				} else {
					console.error(result);
					store.remove("userData");
					this.$router.replace({ name: "login" });
				}
			}
		},
		getChannels: async function() {
			const $this = this;
			if (this.userData && this.userData.user_profile) {
				const result = await ClubHouseApi.api.getChannels(this.reqProfile);
				console.log(result);
				if (result.success) {
					this.channelsResult = result;
					this.channels = result.channels.filter(channel =>
						store.get("settings").filterEastern
							? isLatinString(channel.topic)
							: true
					);
					this.channelsLoading = false;
					if (this.channelsInterval) {
						clearInterval(this.channelsInterval);
					}
					this.channelsInterval = setInterval(function() {
						$this.getChannels();
					}, 30000);
				} else {
					console.error(result);
					if (this.events.length) {
						this.getChannels();
					}
				}
			}
		},
		logout: function() {
			store.remove("userData");
			this.$router.replace("/");
		},
		createChannel: async function() {
			this.newRoom.modalVisible = false;
			const result = await ClubHouseApi.api.createChannel(this.reqProfile, {
				topic: this.newRoom.topic || "",
				guests: this.newRoomFriends,
				isPrivate: this.newRoomType == "private",
				isSocialized: this.newRoomType == "social"
			});
			if (result.success) {
				this.$router.push({
					name: "channel",
					params: { name: result.channel }
				});
			} else {
				console.error(error);
				const notif = new Notification("Failed", {
					body: result.error_message
				});
			}
		},
		search: function(e) {
			e.preventDefault();
			this.$router.push({ name: "search", params: { q: this.searchQuery } });
			return false;
		},
		invitePerson: async function() {
			if (this.newInvite.name.length && this.newInvite.phone.length) {
				const result = await ClubHouseApi.api.inviteToApp(
					this.reqProfile,
					this.newInvite.name,
					this.newInvite.phone
				);
				console.log(result);
				if (result.success) {
					this.$toastr.Add({
						name: `invited`,
						msg: `${this.newInvite.phone} Invited`,
						title: this.newInvite.name,
						type: "info",
						timeout: 4000,
						position: "toast-bottom-right",
						style: { backgroundImage: "none !important" }
					});
					this.getMe();
				} else {
					console.error(result);
					new Notification("Failed", {
						body: result.error_message || ""
					});
				}
			}
		},
		inviteToRoom: async function(user) {
			console.log(user.user_id);
			const result = await ClubHouseApi.api.inviteToExistingChannel(
				this.reqProfile,
				{
					channel: this.name,
					user: user.user_id
				}
			);
			console.log(result);
			if (result.success) {
				new Notification("Sent", {
					body: `An invite has been sent to ${user.name}`
				});
			} else {
				console.error(result);
				new Notification("Failed", {
					body: result.error_message || ""
				});
			}
		}
	},
	watch: {
		"$route.params": {
			handler(newValue, oldValue) {
				const { name } = newValue;

				if (oldValue && oldValue.name != name) {
					this.name = name;

					if (!this.loading) {
						const userData = store.get("userData");
						const profiles = {
							...ClubHouseApi.profiles.application.a304,
							...ClubHouseApi.profiles.locales.English,
							userId: userData.user_profile.user_id,
							token: userData.auth_token
						};
						const result = ClubHouseApi.api.leaveChannel(
							profiles,
							oldValue.name
						);
						if (this.activePingInterval) {
							clearInterval(this.activePingInterval);
						}
						if (client) {
							client.leave();
						}
						if (pubnub) {
							pubnub.unsubscribeAll();
						}
						client = null;
						pubnub = null;
						this.isSpeaker = false;
						this.isModerator = false;
						this.loading = true;
						this.users = null;
						this.channel = null;
						this.getChannel();
					}
				}
			},
			immediate: true
		}
	},
	template: `
        <div class="channel-page">
        <div>
            <div class="c-modal" v-if="newRoom.modalVisible">
                <div class="c-modal-content">
                    <div class="d-flex align-items-center justify-content-between border-bottom mb-4 pb-2">
                        <strong class="c-modal-title">Create Room</strong>
                        <i class="far fa-times cursor-pointer" @click="newRoom.modalVisible = false"></i>
                    </div>
                    <label class="font-size-small">Room Topic:</label>
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Enter a topic" v-model="newRoom.topic" />
                    </div>
                    <label class="font-size-small mt-3">Room Type:</label>
                    <div class="row mt-1">
                        <div class="col-4">
                            <div class="custom-radio">
                                <input type="radio" v-model="newRoomType" value="public" name="newRoomType"/>
                                <label>
                                    <strong>Public</strong>
                                    <small>Anyone can join</small>
                                </label>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="custom-radio">
                                <input type="radio" v-model="newRoomType" value="social" name="newRoomType"/>
                                <label>
                                    <strong>Social</strong>
                                    <small>Only people you follow can join</small>
                                </label>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="custom-radio">
                                <input type="radio" v-model="newRoomType" value="private" name="newRoomType"/>
                                <label>
                                    <strong>Private</strong>
                                    <small>Only people you invite can join</small>
                                </label>
                            </div>
                        </div>
                    </div>
                    <label class="font-size-small mt-3">Add Friends:</label>
                    <div class="add-friends mt-1" v-if="onlineFriends && onlineFriends.length">
                        <div class="online-friend" v-for="user in onlineFriends">
                            <input type="checkbox" :value="user.user_id" v-model="newRoomFriends" />
                            <label>
                            <div class="online-friend-img">
                                <img :src="user.photo_url"/>
                            </div>
                            <div class="online-friend-body">
                                <strong>{{user.name}}</strong>
                                <template v-if="user.channel">
                                    <small v-if="user.is_speaker">Speaker at {{user.topic}}</small>
                                    <small v-if="!user.is_speaker">In {{user.topic}}</small>
                                </template>
                                <small v-if="!user.channel && user.last_active_minutes <= 10">Online</small>
                                <small v-if="!user.channel && user.last_active_minutes > 10">Last seen {{user.last_active_minutes}} minutes ago</small>
                            </div>
                            </label>
                        </div>
                    </div>
                    <button class="btn-success d-block w-100 mt-4" @click="createChannel">
                        <i class="far fa-check"></i>
                        <strong>Create</strong>
                    </button>
                </div>
            </div>
            <div class="c-modal" v-if="newInvite.modalVisible">
                <div class="c-modal-content">
                    <div class="d-flex align-items-center justify-content-between border-bottom mb-4 pb-2">
                        <strong class="c-modal-title">Invite Your Friend</strong>
                        <i class="far fa-times cursor-pointer" @click="newInvite.modalVisible = false"></i>
                    </div>
                    <div v-if="myProfile && myProfile.num_invites">
                        <label class="font-size-small">Your friend's name:</label>
                        <div class="input-group mb-3">
                            <input type="text" class="form-control" placeholder="John Lee" v-model="newInvite.name" />
                        </div>
                        <label class="font-size-small">Your friend's phone number:</label>
                        <div class="input-group">
                            <input type="text" class="form-control" placeholder="+4432214324" v-model="newInvite.phone" />
                        </div>
                        <button class="btn-success d-block w-100 mt-5" @click="invitePerson">
                            <i class="far fa-check"></i>
                            <strong>Invite</strong>
                        </button>
                    </div>
                    <div v-if="!myProfile || !myProfile.num_invites">
                        <p class="text-muted text-center mt-2">You have no invites left</p>
                    </div>
                </div>
            </div>
            <div class="d-flex align-items-center justify-content-between mb-5 header">
                <div class="d-flex align-items-center justify-content-start">
                    <img :src="'assets/images/handwave.png'" height="32"/>
                    <div class="d-flex align-items-start justify-content-center flex-column ml-3">
                        <h1 class="h5 mb-n1">ClubHouse</h1>
                        <small class="text-muted">Unofficial | Developed by @callmearta</small>
                    </div>
                    <button class="btn-success font-size-small font-weight-bold ml-3" @click="newRoom.modalVisible = true"><i class="fas fa-plus mr-2"></i>Create Room</button>
                </div>
                <div class="d-flex align-items-center justify-content-end">
                    <form class="search-input" @submit="search">
                        <input type="text" placeholder="Search" v-model="searchQuery" />
                        <i class="far fa-search" @click="search"></i>
                    </form>
                    <span class="mr-4 btn-light cursor-pointer has-badge" @click="$router.push({name:'notifications'})">
                        <em class="badge" v-if="myProfile && myProfile.has_unread_notifications"></em>
                        <i class="far fa-bell"></i>
                    </span>
                    <span class="mr-4 btn-light cursor-pointer has-badge" @click="newInvite.modalVisible = true">
                        <em class="badge">{{myProfile ? myProfile.num_invites : 0}}</em>
                        <i class="far fa-envelope"></i>
                    </span>
                    <router-link to="/me" class="mr-4 btn-light">
                        <i class="far fa-user"></i>
                    </router-link>
                    <button @click="logout" class="btn-primary font-weight-bold font-size-small"><i class="fas fa-sign-out mr-2"></i>Logout</button>
                </div>
            </div>

            <div class="card online-friends p-3 mt-3 mb-4">
                <h5 class="mb-4 mt-2 h6">Online Friends</h5>
                <loading v-if="onlineFriendsLoading" />
                <div class="online-friend" v-for="user in onlineFriends" v-if="!onlineFriendsLoading">
                    <div class="online-friend-img cursor-pointer" @click="$router.push({name:'user',params:{id:user.user_id}})">
                        <img :src="user.photo_url"/>
                    </div>
                    <div class="online-friend-body">
                        <strong class="cursor-pointer" @click="$router.push({name:'user',params:{id:user.user_id}})">{{user.name}}</strong>
                        <template v-if="user.channel">
                            <small v-if="user.is_speaker">Speaker at {{user.topic}}</small>
                            <small v-if="!user.is_speaker">In {{user.topic}}</small>
							<div>
								<button class="btn-success-light" @click="$router.push({name:'channel',params:{name: user.channel}})">Join Them</button>
							</div>
                        </template>
                        <small v-if="!user.channel">
						{{user.last_active_minutes > 10 ? 'Last seen ' + user.last_active_minutes + ' mins ago' : 'Online'}}
                        </small>
						<button v-if="user.last_active_minutes <= 10" class="btn-text" @click="inviteToRoom(user)">Invite To Room</button>
                    </div>
                </div>
            </div>

            <div class="card other-channels p-3 mt-3 mb-4">
                <h5 class="mb-4 mt-2 h6">Other Rooms</h5>
                <loading v-if="channelsLoading"/>
                <channel-h :current="true" :channel="channels.find(c => c && c.channel == name)" v-if="!channelsLoading"></channel-h>
                <channel-h :channel="channel" v-for="channel in channels.filter(c => c && c.channel != name)" v-if="!channelsLoading"></channel-h>
            </div>

            <loading v-if="loading"/>
            <div class="channel-inner" v-if="!loading">
                <div class="d-flex align-items-center justify-content-between px-4 pt-4">
                    <h1 class="h4 overflow-ellipsis">{{channel.topic}}</h1>
                    <div class="d-flex align-items-center justify-content-end">
						<button class="btn-light mr-3" @click="$router.replace('/')">
						    <i class="far fa-home cursor-pointer" ></i>
						</button>
                        <button class="btn-light mr-3" @click="handRaise" v-if="!isSpeaker && channel.handraise_permission">
                            <img :src="this.handRaised ? 'assets/images/fist.png' : 'assets/images/handraise.png'" height="18" />
                        </button>
                        <button class="btn-light mr-3" @click="getChannel">
                            <i class="far fa-sync"></i>
                        </button>
                        <button class="btn-grey mr-3" @click="unmute" v-if="isSpeaker && users.find(user => user.user_id == userData.user_profile.user_id) && !users.find(user => user.user_id == userData.user_profile.user_id).unmute">
                            <i class="far fa-microphone-slash"></i>
                        </button>
                        <button class="btn-light mr-3" @click="mute" v-if="isSpeaker && users.find(user => user.user_id == userData.user_profile.user_id) && users.find(user => user.user_id == userData.user_profile.user_id).unmute">
                            <i class="far fa-microphone"></i>
                        </button>
                        <button @click="leave" class="btn-primary">Leave Room</button>
                    </div>
                </div>

                <section class="p-4">
                    <h3 class="mt-2 h5">Speakers</h3>
                    <transition-group name="user" tag="div" class="users">
                        <user v-bind:class="{user:true, isSpeaking: user.speaking }" v-for="user in users.filter(user => user.is_speaker || user.is_moderator)" :key="user.user_id" :user="user" :isModerator="isModerator" :isSpeaker="isSpeaker" :channel="channel.channel" />
                    </transition-group>
                </section>
                <div class="followed-by-speakers p-4" v-if="users.filter(user => user.is_followed_by_speaker && (!user.is_moderator && !user.is_speaker)).length">
                    <h3 class="mt-4 h5">Followed By Speakers</h3>
                    <div name="user" class="users">
                        <user v-for="user in users.filter(user => user.is_followed_by_speaker && (!user.is_moderator && !user.is_speaker))" :key="user.user_id" :user="user" :isModerator="isModerator" :isSpeaker="isSpeaker" :channel="channel.channel" />
                    </div>
                </div>
                <section class="p-4" v-if="users.filter(user => !user.is_followed_by_speaker && !user.is_speaker && !user.is_moderator).length">
                    <h3 class="mt-4 h5">Users</h3>

                    <div class="users">
                        <user v-for="user in users.filter(user => !user.is_followed_by_speaker && !user.is_speaker && !user.is_moderator).slice(0,500)" :key="user.user_id" :user="user" :isModerator="isModerator" :isSpeaker="isSpeaker" :channel="channel.channel" />
                        <div v-if="users.filter(user => !user.is_followed_by_speaker && !user.is_speaker && !user.is_moderator).length > 500" key="more" style="width:80px;height:130px;background:var(--cream-color);display:flex;align-items:center;justify-content:center;border-radius:15px;">+{{users.filter(user => !user.is_followed_by_speaker && !user.is_speaker && !user.is_moderator).length - 500}}</div>
                    </div>

                </section>

            </div>
            
        </div>
        </div>
    `
};

export default Channel;
