import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';

export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    removeAccountPosts(id) {
        if (AccessControl.writeGrantedAdminOrOwner(this.HttpContext.authorizations, AccessControl.admin(), id)) {
            this.repository.keepByFilter((post) => post.userId != id);
        }
    }
}