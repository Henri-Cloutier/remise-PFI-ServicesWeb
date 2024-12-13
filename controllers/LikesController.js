import LikeModel from "../models/like.js";
import Repository from "../models/repository.js";
import Controller from "./Controller.js";
import TokenManager from "../tokensManager.js";
import AccessControl from "../accessControl.js";
import AccountsController from "./AccountsController.js";

export default class LikesController extends Controller {
  //TODO finir le controller pour les likes pour que juste le user connecté peut mettre un like
  constructor(HttpContext) {
    super(HttpContext, new Repository(new LikeModel()), AccessControl.admin());
  }
  AddLike(receivedLike) {
    let user = TokenManager.getUser(this.HttpContext.req);
    if (user != null && user.Id == receivedLike.userId) {
      if (
        this.repository.findByFilter(
          (like) =>
            like.userId == receivedLike.userId &&
            like.postId == receivedLike.postId
        ).length == 0
      ) {

        receivedLike.userName = new AccountsController().repository.get(
          receivedLike.userId
        ).Name;
        this.repository.add(receivedLike);
        this.HttpContext.response.accepted();
      } else {
        console.log("Bad Request: Like already exists");
        this.HttpContext.response.badRequest();
      }
    } else {
      this.HttpContext.response.unAuthorized(
        "Votre token d'accès n'existe pas"
      );
    }
  }
  RemoveLike(receivedLike) {
    let user = TokenManager.getUser(this.HttpContext.req);
    if (user != null && user.Id == receivedLike.userId) {
      if (
        this.repository.findByFilter(
          (like) =>
            like.userId == receivedLike.userId &&
            like.postId == receivedLike.postId
        ).length != 0
      ) {
        console.log("Like found");
        this.repository.keepByFilter(
          (like) =>
            like.userId != receivedLike.userId ||
            like.postId != receivedLike.postId
        );
        this.HttpContext.response.ok();
      } else {
        console.log("Bad Request: Like doesn't exist");
        this.HttpContext.response.badRequest();
      }
    }else {
        this.HttpContext.response.unAuthorized(
          "Votre token d'accès n'existe pas"
        );
    }
  }
  GetLikes(data) {
    this.HttpContext.response.JSON(
      this.repository.findByFilter((like) => like.postId == data.postId)
    );
  }
}
