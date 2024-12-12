import LikeModel from '../models/like.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import TokenManager from '../tokensManager.js';
import AccessControl from '../accessControl.js';
import AccountsController from './AccountsController.js';



export default class LikesController extends Controller { //TODO finir le controller pour les likes pour que juste le user connecté peut mettre un like
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikeModel()), AccessControl.admin());
    }
    AddLike(receivedLike) {
        if(this.repository.findByFilter((like) => like.userId == receivedLike.userId && like.postId == receivedLike.postId).length == 0) {
            this.repository.add(receivedLike);
            this.HttpContext.response.accepted();
        }
        else{
            console.log("Bad Request: Like already exists");
            this.HttpContext.response.badRequest();
        }
    }
    RemoveLike(receivedLike) {
        if(this.repository.findByFilter((like) => like.userId == receivedLike.userId && like.postId == receivedLike.postId).length != 0) {
            console.log("Like found");
            this.repository.keepByFilter((like) => like.userId != receivedLike.userId && like.postId != receivedLike.postId);
            this.HttpContext.response.ok();
        }
        else{
            console.log("Bad Request: Like doesn't exist");
            this.HttpContext.response.badRequest();
        }
    }
    GetLikes(postId){
        let likes = this.repository.findByFilter((like) => like.postId == postId);
        console.log(likes);
        let accountsController = new AccountsController(this.HttpContext);
        let users = accountsController.repository.findByFilter((user) => likes.map((like => user.Id == like.userId && postId == like.postId)));
        this.HttpContext.response.JSON(users);
    }
}