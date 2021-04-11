const ClubHouseApi = require("clubhouse-api");
const store = require("store");
const path = require("path");
const fs = require("fs");

const User = {
	props: ["id"],
	mounted: function() {
		const userData = store.get("userData");
		if (userData.user_profile.user_id == this.id || !this.id) {
			this.isMe = true;
			return this.getMe();
		} else {
			this.getProfile();
			return this.getUser();
		}
	},
	data: function() {
		return {
			user: null,
			isMe: false,
			loading: true,
			editName: {
				modalVisible: false,
				value: ""
			},
			editUsername: {
				modalVisible: false,
				value: ""
			},
			editBio: {
				modalVisible: false,
				value: ""
			},
			newPhoto: null,
			profile: null,
			filterRooms: store.get("settings").filterRooms.join("\n"),
			filterEastern: Number(store.get("settings").filterEastern)
		};
	},
	methods: {
		getUser: async function() {
			const userData = store.get("userData");
			this.loading = true;
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.getUser(profile, Number(this.id));
			console.log(result);
			if (result.success) {
				this.user = result;
                if (userData.followingIds === undefined) {
                    userData.followingIds = await this.getFollowings();
                    store.set('userData', userData);
                }
                this.$set(
                        this.user.user_profile,
                        'my_following',
                        userData.followingIds.findIndex(id => id == this.id) > -1);
				this.loading = false;
			} else {
				console.error(result);
				const notif = new Notification("Failed", {
					body: result.error_message
				});
			}
		},
		getMe: async function() {
			const userData = store.get("userData");
			this.loading = true;
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.getUser(
				profile,
				Number(userData.user_profile.user_id)
			);
			console.log(result);
			if (result.success) {
				this.user = result;
				this.loading = false;

				this.$set(this.editName, "value", result.user_profile.name);
				this.$set(this.editUsername, "value", result.user_profile.username);
				this.$set(this.editBio, "value", result.user_profile.bio);
			} else {
				console.error(result);
				const notif = new Notification("Failed", {
					body: result.error_message
				});
			}
		},
		getProfile: async function() {
			const userData = store.get("userData");
			this.loading = true;
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.getProfile(profile);
			console.log(result);
			if (result.success) {
				this.profile = result;
			} else {
				console.error(result);
				const notif = new Notification("Failed", {
					body: result.error_message
				});
			}
		},
        getFollowings:async function(){
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getFollowing(
                    profile,
                    Number(userData.user_profile.user_id));
            if (result.success) {
                var followingUserIds = [];
                result.users.forEach((user) => followingUserIds.push(user.user_id));
                return followingUserIds;
            } else{
                new Notification('Failed',{
                    body: 'Failed'
                });
            }
        },
		follow: async function() {
			const userData = store.get("userData");
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};

			const result = await ClubHouseApi.api.followUser(
				profile,
				Number(this.id)
			);
			console.log(result);
			if (result.success) {
                if (userData.followingIds === undefined) {
                    userData.followingIds = await this.getFollowings();
                }
                userData.followingIds.push(this.id);
                store.set('userData', userData);
                this.$set(
                        this.user,
                        'user_profile',
                        {
                            ...this.user.user_profile,
                            notification_type:2,
                            my_following: true});
			} else {
				console.error(result);
			}
		},
		unfollow: async function() {
			const userData = store.get("userData");
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.unfollowUser(
				profile,
				Number(this.id)
			);
			console.log(result);
			if (result.success) {
                if (userData.followingIds === undefined) {
                    userData.followingIds = await this.getFollowings();
                }
                var filteredIds = userData.followingIds.filter(
                        (value, index) => value !== this.id);
                userData.followingIds = filteredIds;
                store.set('userData', userData);
                this.$set(
                        this.user,
                        'user_profile',
                        {
                            ...this.user.user_profile,
                            notification_type:null,
                            my_following: false});
				}
			else {
				console.error(result);
			}
		},
		enlargeImg: function() {
			const enlargedWrapper = document.createElement("div");
			enlargedWrapper.id = "enlarged";
			const enlargedImg = document.createElement("img");
			enlargedImg.src = this.user.user_profile.photo_url;
			enlargedWrapper.appendChild(enlargedImg);
			enlargedWrapper.addEventListener("click", function(e) {
				e.preventDefault();
				this.remove();
			});
			document.body.append(enlargedWrapper);
		},
		changeName: async function() {
			this.loading = true;
			const userData = store.get("userData");
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.updateName(
				profile,
				this.editName.value
			);
			console.log(result);
			if (result.success) {
				window.location.reload();
			} else {
				console.error(result);
				new Notification("Failed", {
					body: result.error_message || ""
				});
			}
		},
		changeUsername: async function() {
			this.loading = true;
			const userData = store.get("userData");
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.updateUsername(
				profile,
				this.editUsername.value
			);
			console.log(result);
			if (result.success) {
				window.location.reload();
			} else {
				this.loading = false;
				console.error(result);
				new Notification("Failed", {
					body: result.error_message || ""
				});
			}
		},
		changeBio: async function() {
			this.loading = true;
			const userData = store.get("userData");
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const result = await ClubHouseApi.api.updateBio(
				profile,
				this.editBio.value
			);
			console.log(result);
			if (result.success) {
				window.location.reload();
			} else {
				this.loading = false;
				console.error(result);
				new Notification("Failed", {
					body: result.error_message || ""
				});
			}
		},
		changePhoto: async function(e) {
			this.loading = true;
			const $this = this;
			const userData = store.get("userData");
			const profile = {
				...ClubHouseApi.profiles.application.a304,
				...ClubHouseApi.profiles.locales.English,
				userId: userData.user_profile.user_id,
				token: userData.auth_token
			};
			const file = e.target.files[0];

			const result = await ClubHouseApi.api.updateAvatar(
				profile,
				fs.createReadStream(path.resolve(file.path))
			);
			console.log(result);
			if (result.success) {
				window.location.reload();
			} else {
				$this.loading = false;
				console.error(result);
				new Notification("Failed", {
					body: result.error_message || ""
				});
			}
		},
		changeFilterRooms: function() {
			store.set("settings", {
				filterEastern: this.filterEastern,
				filterRooms: this.filterRooms.split("\n")
			});
		},
		changeFilterEastern: function() {
			store.set("settings", {
				...store.get("settings"),
				filterEastern: this.filterEastern
			});
		}
	},
	watch: {
		"$route.params": {
			handler(newValue) {
				const userData = store.get("userData");
				const { id } = newValue;

				if (!this.loading) {
					if (id === userData.user_profile.user_id || !id) {
						this.getMe();
					} else {
						this.getUser(id);
					}
				}
			},
			immediate: true
		}
	},
	template: `
    <div>
        <div class="loading mt-5" v-if="loading || (!profile && !isMe)"><div></div><div></div><div></div><div></div></div>
        <div v-if="(!loading && profile && !isMe) || !loading" class="user-page center justify-content-start">
            <div class="c-modal" v-if="editName.modalVisible">
                <div class="c-modal-content">
                    <div class="d-flex align-items-center justify-content-between border-bottom mb-4 pb-2">
                        <strong class="c-modal-title">Edit Name</strong>
                        <i class="far fa-times cursor-pointer" @click="editName.modalVisible = false"></i>
                    </div>
                    <label class="font-size-small">Your Name:</label>
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Enter your name" v-model="editName.value" />
                    </div>
                    <button class="btn-success d-block w-100 mt-4" @click="changeName">
                        <i class="far fa-check"></i>
                        <strong>Change</strong>
                    </button>
                </div>
            </div>
            <div class="c-modal" v-if="editUsername.modalVisible">
                <div class="c-modal-content">
                    <div class="d-flex align-items-center justify-content-between border-bottom mb-4 pb-2">
                        <strong class="c-modal-title">Edit Name</strong>
                        <i class="far fa-times cursor-pointer" @click="editUsername.modalVisible = false"></i>
                    </div>
                    <label class="font-size-small">Your Name:</label>
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Enter your username" v-model="editUsername.value" />
                    </div>
                    <button class="btn-success d-block w-100 mt-4" @click="changeUsername">
                        <i class="far fa-check"></i>
                        <strong>Change</strong>
                    </button>
                </div>
            </div>
            <div class="c-modal" v-if="editBio.modalVisible">
                <div class="c-modal-content">
                    <div class="d-flex align-items-center justify-content-between border-bottom mb-4 pb-2">
                        <strong class="c-modal-title">Edit Name</strong>
                        <i class="far fa-times cursor-pointer" @click="editBio.modalVisible = false"></i>
                    </div>
                    <label class="font-size-small">Your Name:</label>
                    <div class="input-group">
                        <textarea type="text" class="form-control" placeholder="Enter your bio" v-model="editBio.value" />
                    </div>
                    <button class="btn-success d-block w-100 mt-4" @click="changeBio">
                        <i class="far fa-check"></i>
                        <strong>Change</strong>
                    </button>
                </div>
            </div>
            <div class="card p-4 my-5 max-width-500 mt-5 mx-auto">
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted cursor-pointer" @click="$router.go(-1)">Go Back</span>
                    <div class="d-flex align-items-center justify-content-end">
                        <i class="far fa-home text-muted cursor-pointer" @click="$router.replace('/')"></i>
                    </div>
                </div>
                <div class="d-flex align-items-center justify-content-center flex-column" v-if="user">
                    <div class="user-page-img-outer has-badge">
                        <em v-if="user.user_profile.follows_me" class="badge follow-badge">Follows You</em>
                        <em v-if="isMe" class="badge new-image-badge">
                            <input type="file" @change="changePhoto" accept="image/jpeg" value="newPhoto">
                            <i class="far fa-camera"></i>
                        </em>
                        <div class="user-page-img" @click="enlargeImg">
                            <img :src="user.user_profile.photo_url" />
                        </div>
                    </div>
                    <h1 class="h5 mb-0 mt-3">{{user.user_profile.name}}<i class="far fa-pencil ml-2 cursor-pointer" @click="editName.modalVisible = true" v-if="isMe && user.user_profile.can_edit_name"></i></h1>
                    <small class="text-muted">@{{user.user_profile.username}}<i class="far fa-pencil ml-2 cursor-pointer" @click="editUsername.modalVisible = true" v-if="isMe && user.user_profile.can_edit_username"></i></small>
                    <small class="text-muted">Joined At: {{new Date(user.user_profile.time_created).toDateString()}}</small>
                    <button class="btn-primary mt-3" @click="follow" v-if="!isMe && !user.user_profile.my_following">Follow</button>
                    <button class="btn-primary mt-3" @click="unfollow" v-if="!isMe && user.user_profile.my_following">Unfollow</button>
                    <small class="text-muted mt-2" v-if="user.user_profile.mutual_follows.length">Followed By {{user.user_profile.mutual_follows.reduce((p1,p2) => [...p1,p2.name],[]).join(', ')}}</small>
                    <div class="d-flex align-items-center justify-content-center mt-3">
                        <router-link :to="{name:'userlist',params:{id:user.user_profile.user_id,type:'followers'}}" class="mr-3 cursor-pointer color-dark">{{user.user_profile.num_followers}} Followers</router-link>
                        <router-link :to="{name:'userlist',params:{id:user.user_profile.user_id,type:'followings'}}" class="cursor-pointer color-dark">{{user.user_profile.num_following}} Followings</router-link>
                    </div>
                    <div class="mt-2 pt-1 border-top w-100" v-if="user.user_profile.invited_by_user_profile">
                        <small class="text-muted">Nominated By:</small>
                        <router-link :to="{name:'user',params:{id:user.user_profile.invited_by_user_profile.user_id}}" class="invited-by mt-2">
                            <div class="user-img">
                                <img :src="user.user_profile.invited_by_user_profile.photo_url" alt=""/>
                            </div>
                            <div class="user-details">
                                <strong>{{user.user_profile.invited_by_user_profile.name}}</strong>
                                <small>@{{user.user_profile.invited_by_user_profile.username}}</small>
                            </div>
                        </router-link>
                    </div>
                    <div class="d-flex align-items-center justify-content-start border-top mt-2 pt-3 w-100">
                        <a :href="'https://instagram.com/' + user.user_profile.instagram" title="" target="_blank" class="text-dark mr-3" v-if="user.user_profile.instagram">
                            <i class="fab fa-instagram"></i>
                            <span>{{user.user_profile.instagram}}</span>
                        </a>
                        <a :href="'https://twitter.com/' + user.user_profile.twitter" title="" target="_blank" class="text-dark" v-if="user.user_profile.twitter">
                            <i class="fab fa-twitter"></i>
                            <span>{{user.user_profile.twitter}}</span>
                        </a>
                    </div>
                    <div class="w-100" v-if="user.user_profile.clubs && user.user_profile.clubs.length">
                        <small class="text-muted">Clubs:</small>
                        <div class="clubs">
                            <router-link :to="{name:'club',params:{id: club.club_id}}" class="club" v-for="club in user.user_profile.clubs" :key="club.club_id" :title="club.name">
                                <div class="club-img">
                                    <img :src="club.photo_url"/>
                                </div>
                                <span>{{club.name}}</span>
                            </router-link>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-end w-100 border-bottom pb-3 mb-2" v-if="isMe">
                        <i class="far fa-pencil cursor-pointer" @click="editBio.modalVisible = true"></i>
                    </div>
                    <pre class="mt-2 pt-3 w-100">{{user.user_profile.bio}}</pre>
                    <div class="settings mt-2 pt-3 border-top w-100" v-if="isMe">
                        <section>
                            <label>Hide Japanese/Chienese Rooms:</label>
                            <div class="row">
                                <div class="col-6 input-group custom-radio">
                                    <input type="radio" name="filterEastern" @change="changeFilterEastern" value="1" v-model="filterEastern"/>
                                    <label>On</label>
                                </div>
                                <div class="col-6 input-group custom-radio">
                                    <input type="radio" name="filterEastern" @change="changeFilterEastern" value="0" v-model="filterEastern"/>
                                    <label>Off</label>
                                </div>
                            </div>
                        </section>
                        <section class="mt-2">
                            <label>Hide Rooms Containing Following Words ( One Word Each Line ):</label>
                            <div class="input-group">
                                <textarea v-model="filterRooms" @change="changeFilterRooms" class="form-control" />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

export default User;
