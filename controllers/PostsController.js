import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    removeAllAccountPost(userId){
        if (this.repository != null) {
            this.repository.keepByFilter((object) => object.userId != userId);
        }
    }
}