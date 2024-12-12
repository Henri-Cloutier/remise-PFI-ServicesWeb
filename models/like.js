import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(false /* secured Id */);

        this.addField('userId', 'string');
        this.addField('postId', 'string');
              
        this.setKey("userId");
    }
}