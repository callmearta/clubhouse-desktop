const ChannelH = {
    props:['channel','current'],
    template:`
        <div v-bind:class="{'channel-h':true,'cursor-pointer':true,'current':current}" @click="$router.push({name:'channel',params:{name:channel.channel}})">
            <strong>{{channel.topic}}</strong>
            <div class="channel-h-inner">
                <div class="channel-h-imgs">
                    <img :src="channel.users[0].photo_url" v-if="channel.users.length > 0"/>
                    <img :src="channel.users[1].photo_url" v-if="channel.users.length > 1"/>
                </div>
                <div class="channel-h-body">
                    <ul>
                        <li v-for="user in channel.users.slice(0,4)">
                            {{user.name}}
                        </li>
                    </ul>
                    <div class="channel-meta d-flex align-items-center justify-content-start">
                        <span>
                            <img height="8" :src="'assets/images/user.png'"/>
                            {{channel.num_all}}
                        </span>
                        <span>
                            <img height="10" :src="'assets/images/speaker.png'"/>
                            {{channel.num_speakers}}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `
};

export default ChannelH;