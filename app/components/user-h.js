const Vue = require('vue/dist/vue.js');

const UserH = Vue.component('user-h',{
    props:['user'],
    template: `
        <router-link :to="{name:'user',params:{id:user.user_id}}" class="user-h">
            <div class="user-img">
                <img :src="user.photo_url" />
            </div>
            <div class="user-details">
                <strong class="d-block">{{user.name}}</strong>
                <small class="d-block text-muted">@{{user.username}}</small>
            </div>
        </router-link>
    `
});

export default UserH;