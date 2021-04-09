const ClubHouseApi = require("clubhouse-api");
const store = require("store");

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

const Home = {
	beforeRouteEnter(to, from, next) {
		const userData = store.get("userData");
		if (userData && !userData.is_verified) {
			if (
				!userData.is_verified ||
				userData.is_onboarding ||
				userData.is_waitlisted
			) {
				next(vm => {
					vm.$router.replace({ name: "waitlist" });
				});
			}
		}
		next();
	},
	mounted: function() {
		if (this.userData) {
			this.reqProfile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: this.userData.user_profile.user_id,
				token: this.userData.auth_token
			};
		}
		this.getMe();
		this.getEvents();
		this.getChannels();
		this.getOnlineFriends();
	},
	beforeDestroy: function() {
		console.log("beforeDestroy Home");
		clearInterval(this.channelsInterval);
		this.channelsInterval = null;
		clearInterval(this.onlineFriendsInterval);
		this.onlineFriendsInterval = null;
	},
	data: function() {
		return {
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
			newRoomType: null,
			theme: window.theme,
			roomsKeyword: ""
		};
	},
	methods: {
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
			}, 10000);
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
					new Notification("Invalid Token", {
						body:
							"Your token is invalid. Try again and if you see this error again, Logout and Log in back"
					});
					// store.remove('userData');
					// this.$router.replace({name:'login'});
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
					} else {
						if (this.retry < 2) {
							this.getChannels();
							this.retry++;
						} else {
							new Notification("Invalid Token", {
								body:
									"Your token is invalid. Try again and if you see this error again, Logout and Log in back"
							});
							// store.remove('userData');
							// this.$router.replace({name:'login'});
						}
					}
				}
			}
		},
		logout: function() {
			store.remove("userData");
			this.$router.replace("/");
		},
		createChannel: async function() {
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
		switchTheme: function() {
			if (this.theme == "light") {
				localStorage.setItem("theme", "dark");
				window.theme = "dark";
				this.theme = "dark";
				document.body.classList.remove("light");
				document.body.classList.add("dark");
			} else {
				localStorage.setItem("theme", "light");
				window.theme = "light";
				this.theme = "light";
				document.body.classList.remove("dark");
				document.body.classList.add("light");
			}
		}
	},
	template: `
        <div class="p-5 home">
        <div class="loading" v-if="loading"><div></div><div></div><div></div><div></div></div>
        <div v-if="!loading">
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
                    <span class="mr-4 btn-light cursor-pointer" @click="switchTheme">
                        <i class="far fa-moon" v-if="theme == 'dark'"></i>
                        <i class="fas fa-sun" v-if="theme == 'light'"></i>
                    </span>
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
                <div class="online-friend" v-for="user in onlineFriends" v-if="!onlineFriendsLoading">
                    <div class="online-friend-img cursor-pointer" @click="$router.push({name:'user',params:{id:user.user_id}})">
                        <img :src="user.photo_url"/>
                    </div>
                    <div class="online-friend-body">
                        <strong class="cursor-pointer" @click="$router.push({name:'user',params:{id:user.user_id}})">{{user.name}}</strong>
                        <template v-if="user.channel">
                            <small v-if="user.is_speaker">Speaker at {{user.topic}}</small>
                            <small v-if="!user.is_speaker">In {{user.topic}}</small>
                            <button class="btn-success-light" @click="$router.push({name:'channel',params:{name: user.channel}})">Join Them</button>
                        </template>
                        <small v-if="!user.channel">
                            {{user.last_active_minutes > 10 ? 'Last seen ' + user.last_active_minutes + ' mins ago' : 'Online'}}
                        </small>
                    </div>
                </div>
            </div>

            <h5>Events</h5>
            <div class="events-wrapper">
                <div class="loading" v-if="eventsLoading"><div></div><div></div><div></div><div></div></div>
                <div class="events" v-if="!eventsLoading">
                    <router-link :to="event.channel ? {name:'channel',params:{name: event.channel}} : '#'" class="event card my-2" v-for="event in events" :key="event.event_id">
                        <div class="card-header p-3">
                            <h5 class="mb-0">{{event.name}}</h5>
                        </div>
                        <div class="card-body p-3" v-if="event.description.length">
                            <p>{{event.description}}</p>
                        </div>
                    </router-link>
                </div>
            </div>
            
            <div class="d-flex align-items-center justify-content-start mt-4 mb-2">
                <h5>Rooms</h5>
                <div class="search-input ml-3">
                    <input type="text" placeholder="Search in current rooms..." v-model="roomsKeyword" />
                    <i class="far fa-search"></i>
                </div>
            </div>
            <div class="loading" v-if="channelsLoading"><div></div><div></div><div></div><div></div></div>
            <transition-group tag="div" name="channel" class="channels" v-if="!channelsLoading">
                <router-link :to="{name:'channel',params:{id: channel.channel_id, name: channel.channel}}" class="channel card my-2" v-for="channel in (roomsKeyword ? channels.filter(c => c.topic && c.topic.toLowerCase().includes(roomsKeyword.toLowerCase())) : channels)" :key="channel.channel_id">
                    <div class="card-body p-3">
                        <h5 class="mb-0">{{channel.topic}}</h5>
                        <div class="channel-users" v-if="channel.users.length">
                            <div class="channel-users-images">
                                <div class="channel-users-image">
                                    <img :src="channel.users[0].photo_url"/>
                                </div>
                                <div v-if="channel.users.length > 1" class="channel-users-image">
                                    <img :src="channel.users[1].photo_url"/>
                                </div>
                            </div>
                            <div class="channel-users-list">
                                <ul>
                                    <li v-for="user in channel.users">
                                        {{user.name}}
                                    </li>
                                </ul>
                            </div>
                            <div class="channel-meta d-flex align-items-center justify-content-start">
                                <span>
                                    <img height="12" :src="'assets/images/user.png'"/>
                                    {{channel.num_all}}
                                </span>
                                <span>
                                    <img height="14" :src="'assets/images/speaker.png'"/>
                                    {{channel.num_speakers}}
                                </span>
                            </div>
                        </div>
                    </div>
                </router-link>
            </transition-group>
        </div>
        </div>
    `
};

export default Home;
