////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;

let userToken = null;

Init_UI();
async function Init_UI() {
  $("#logoContainer").click(function () {
    showPosts();
  });
  postsPanel = new PageManager(
    "postsScrollPanel",
    "postsPanel",
    "postSample",
    renderPosts
  );
  $("#createPost").on("click", async function () {
    showCreatePostForm();
  });
  $("#connect").on("click", async function () {
    renderConnectionForm();
  });
  $("#userProfile").on("click", async function () {
    renderAccountForm(userToken.User);
  });
  $("#abort").on("click", async function () {
    showPosts();
  });
  $("#aboutCmd").on("click", function () {
    showAbout();
  });
  $("#showSearch").on("click", function () {
    toogleShowKeywords();
    showPosts();
  });

  installKeywordsOnkeyupEvent();
  await showPosts();
  start_Periodic_Refresh();
  VerifyIconValidity();
}
function VerifyIconValidity() {
  if (userToken != null) {
    $("#userProfile").show();
    $("#connect").hide();
    $("#createPost").show();
    $("#userProfile").attr("src", userToken.User.Avatar);
    if(userToken.User.isAdmin || userToken.User.isSuper) $("#createPost").show();
    else $("#createPost").hide();
  } else {
    $("#createPost").hide();
    $("#userProfile").hide();
    $("#connect").show();
  }
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {
  $("#searchKeys").on("keyup", function () {
    clearTimeout(keywordsOnchangeTimger);
    keywordsOnchangeTimger = setTimeout(() => {
      cleanSearchKeywords();
      showPosts(true);
    }, keywordsOnchangeDelay);
  });
  $("#searchKeys").on("search", function () {
    showPosts(true);
  });
}
function cleanSearchKeywords() {
  /* Keep only keywords of 3 characters or more */
  let keywords = $("#searchKeys").val().trim().split(" ");
  let cleanedKeywords = "";
  keywords.forEach((keyword) => {
    if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
  });
  $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
  $("#hiddenIcon").hide();
  $("#showSearch").show();
  if (showKeywords) {
    $("#searchKeys").show();
  } else $("#searchKeys").hide();
}
function hideSearchIcon() {
  $("#hiddenIcon").show();
  $("#showSearch").hide();
  $("#searchKeys").hide();
}
function toogleShowKeywords() {
  showKeywords = !showKeywords;
  if (showKeywords) {
    $("#searchKeys").show();
    $("#searchKeys").focus();
  } else {
    $("#searchKeys").hide();
    showPosts(true);
  }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
  $("#hiddenIcon").hide();
  $("#hiddenIcon2").hide();
  $("#menu").show();
  $("#commit").hide();
  $("#abort").hide();
  $("#form").hide();
  $("#form").empty();
  $("#aboutContainer").hide();
  $("#errorContainer").hide();
  showSearchIcon();
  VerifyIconValidity();
}
async function showPosts(reset = false) {
  $("#formUser").hide();

  intialView();
  $("#viewTitle").text("Fil de nouvelles");
  periodic_Refresh_paused = false;
  await postsPanel.show(reset);
  VerifyIconValidity();
}
function hidePosts() {
  postsPanel.hide();
  hideSearchIcon();
  $("#createPost").hide();
  $("#menu").hide();
  periodic_Refresh_paused = true;
}
function showForm() {
  hidePosts();
  $("#form").show();
  $("#commit").show();
  $("#abort").show();
}
function showUserForm() {
  hidePosts();
  $("#form").show();
  $("#commit").show();
  $("#abort").show();
}
function showError(message, details = "") {
  hidePosts();
  $("#form").hide();
  $("#form").empty();
  $("#hiddenIcon").show();
  $("#hiddenIcon2").show();
  $("#commit").hide();
  $("#abort").show();
  $("#viewTitle").text("Erreur du serveur...");
  $("#errorContainer").show();
  $("#errorContainer").empty();
  $("#errorContainer").append($(`<div>${message}</div>`));
  $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
  showForm();
  $("#viewTitle").text("Ajout de nouvelle");
  renderPostForm();
}
function showUserForm() {
  showForm();
  $("#viewTitle").text("Ajout de nouvelle");
  renderPostForm();
}
function showEditPostForm(id) {
  showForm();
  $("#viewTitle").text("Modification");
  renderEditPostForm(id);
}
function showDeletePostForm(id) {
  showForm();
  $("#viewTitle").text("Retrait");
  renderDeletePostForm(id);
}
function showAbout() {
  hidePosts();
  $("#hiddenIcon").show();
  $("#hiddenIcon2").show();
  $("#abort").show();
  $("#viewTitle").text("À propos...");
  $("#aboutContainer").show();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
  $("#reloadPosts").addClass("white");
  $("#reloadPosts").on("click", async function () {
    $("#reloadPosts").addClass("white");
    postsPanel.resetScrollPosition();
    await showPosts();
  });
  setInterval(async () => {
    if (!periodic_Refresh_paused) {
      let etag = await Posts_API.HEAD();
      // the etag contain the number of model records in the following form
      // xxx-etag
      let postsCount = parseInt(etag.split("-")[0]);
      if (currentETag != etag) {
        if (postsCount != currentPostsCount) {
          console.log("postsCount", postsCount);
          currentPostsCount = postsCount;
          $("#reloadPosts").removeClass("white");
        } else await showPosts();
        currentETag = etag;
      }
    }
  }, periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {
  let endOfData = false;
  queryString += "&sort=date,desc";
  compileCategories();
  if (selectedCategory != "") queryString += "&category=" + selectedCategory;
  if (showKeywords) {
    let keys = $("#searchKeys").val().replace(/[ ]/g, ",");
    if (keys !== "")
      queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ",");
  }
  addWaitingGif();
  let response = await Posts_API.Get(queryString);
  if (!Posts_API.error) {
    currentETag = response.ETag;
    currentPostsCount = parseInt(currentETag.split("-")[0]);
    let Posts = response.data;
    if (Posts.length > 0) {
      Posts.forEach((Post) => {
        postsPanel.append(renderPost(Post));
      });
    } else endOfData = true;
    linefeeds_to_Html_br(".postText");
    highlightKeywords();
    attach_Posts_UI_Events_Callback();
  } else {
    showError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
  return endOfData;
}
function renderPost(post) {
  let date = convertToFrenchDate(UTC_To_Local(post.Date));
  let crudIcon = "";
  if (userToken != null) {
    if (userToken.User.Id == post.userId || userToken.User.isSuper) {
      crudIcon += `
        <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
        `;
    }
    if (userToken.User.Id == post.userId || userToken.User.isAdmin || userToken.User.isSuper)
      crudIcon += `
            <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
            `;
  }

  return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
  categories = [];
  let response = await Posts_API.GetQuery("?fields=category&sort=category");
  if (!Posts_API.error) {
    let items = response.data;
    if (items != null) {
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
      if (!categories.includes(selectedCategory)) selectedCategory = "";
      updateDropDownMenu(categories);
    }
  }
}
function updateDropDownMenu() {
  //TODO ajouter option admin
  let DDMenu = $("#DDMenu");
  let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
  DDMenu.empty();
  if (userToken != null && userToken.User.isAdmin) {
    DDMenu.append(
      $(`
        <div class="dropdown-item menuItemLayout" id="userManagement">
            <i class="fa-solid fa-user-gear"></i> Gestion des usagers
        </div>
        <div class="dropdown-divider"></div>
        `)
    );
    $("#userManagement").on("click", function () {
      renderUserManagementForm();
    });
  }
  DDMenu.append(
    $(`
        
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `)
  );
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });
  DDMenu.append($(`<div class="dropdown-divider"></div> `));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `)
  );
  $("#aboutCmd").on("click", function () {
    showAbout();
  });
  $("#allCatCmd").on("click", async function () {
    selectedCategory = "";
    await showPosts(true);
    updateDropDownMenu();
  });
  $(".category").on("click", async function () {
    selectedCategory = $(this).text().trim();
    await showPosts(true);
    updateDropDownMenu();
  });
}
function attach_Posts_UI_Events_Callback() {
  linefeeds_to_Html_br(".postText");
  // attach icon command click event callback
  $(".editCmd").off();
  $(".editCmd").on("click", function () {
    showEditPostForm($(this).attr("postId"));
  });
  $(".deleteCmd").off();
  $(".deleteCmd").on("click", function () {
    showDeletePostForm($(this).attr("postId"));
  });
  $(".moreText").off();
  $(".moreText").click(function () {
    $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
    $(`.lessText[postId=${$(this).attr("postId")}]`).show();
    $(this).hide();
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass(
      "showExtra"
    );
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass(
      "hideExtra"
    );
  });
  $(".lessText").off();
  $(".lessText").click(function () {
    $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
    $(`.moreText[postId=${$(this).attr("postId")}]`).show();
    $(this).hide();
    postsPanel.scrollToElem($(this).attr("postId"));
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass(
      "hideExtra"
    );
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass(
      "showExtra"
    );
  });
}
function addWaitingGif() {
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    postsPanel.itemsPanel.append(
      $(
        "<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"
      )
    );
  }, waitingGifTrigger);
}
function removeWaitingGif() {
  clearTimeout(waiting);
  $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
  $.each($(selector), function () {
    let postText = $(this);
    var str = postText.html();
    var regex = /[\r\n]/g;
    postText.html(str.replace(regex, "<br>"));
  });
}
function highlight(text, elem) {
  text = text.trim();
  if (text.length >= minKeywordLenth) {
    var innerHTML = elem.innerHTML;
    let startIndex = 0;

    while (startIndex < innerHTML.length) {
      var normalizedHtml = innerHTML
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      var index = normalizedHtml.indexOf(text, startIndex);
      let highLightedText = "";
      if (index >= startIndex) {
        highLightedText =
          "<span class='highlight'>" +
          innerHTML.substring(index, index + text.length) +
          "</span>";
        innerHTML =
          innerHTML.substring(0, index) +
          highLightedText +
          innerHTML.substring(index + text.length);
        startIndex = index + highLightedText.length + 1;
      } else startIndex = innerHTML.length + 1;
    }
    elem.innerHTML = innerHTML;
  }
}
function highlightKeywords() {
  if (showKeywords) {
    let keywords = $("#searchKeys").val().split(" ");
    if (keywords.length > 0) {
      keywords.forEach((key) => {
        let titles = document.getElementsByClassName("postTitle");
        Array.from(titles).forEach((title) => {
          highlight(key, title);
        });
        let texts = document.getElementsByClassName("postText");
        Array.from(texts).forEach((text) => {
          highlight(key, text);
        });
      });
    }
  }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
  $("#commit").show();
  addWaitingGif();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    if (Post !== null) renderPostForm(Post);
    else if (Post.userId != userToken.User.Id)
      showError("Vous n'êtes pas l'auteur de ce post");
    else showError("Post introuvable!");
  } else {
    showError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
}
async function renderDeletePostForm(id) {
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let post = response.data;
    if (post !== null) {
      let date = convertToFrenchDate(UTC_To_Local(post.Date));
      $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
      linefeeds_to_Html_br(".postText");
      // attach form buttons click event callback
      $("#commit").on("click", async function () {
        await Posts_API.Delete(post.Id);
        if (!Posts_API.error) {
          await showPosts();
        } else {
          console.log(Posts_API.currentHttpError);
          showError("Une erreur est survenue!");
        }
      });
      $("#cancel").on("click", async function () {
        await showPosts();
      });
    } else {
      showError("Post introuvable!");
    }
  } else showError(Posts_API.currentHttpError);
}
function newPost() {
  let Post = {};
  Post.Id = 0;
  Post.Title = "";
  Post.Text = "";
  Post.Image = "news-logo-upload.png";
  Post.Category = "";
  return Post;
}
function renderPostForm(post = null) {
  let create = post == null;
  if (create) post = newPost();
  $("#form").show();
  $("#form").empty();
  $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="userId" value="${userToken.User.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
  if (create) $("#keepDateControl").hide();

  initImageUploaders();
  initFormValidation(); // important do to after all html injection!

  $("#commit").click(function () {
    $("#commit").off();
    return $("#savePost").trigger("click");
  });
  $("#postForm").on("submit", async function (event) {
    event.preventDefault();
    let post = getFormData($("#postForm"));
    if (post.Category != selectedCategory) selectedCategory = "";
    if (create || !("keepDate" in post)) post.Date = Local_to_UTC(Date.now());
    delete post.keepDate;
    post = await Posts_API.Save(post, create);
    if (!Posts_API.error) {
      await showPosts();
      postsPanel.scrollToElem(post.Id);
    } else showError("Une erreur est survenue! ", Posts_API.currentHttpError);
  });
  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
function getFormData($form) {
  // prevent html injections
  const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
  var jsonObject = {};
  // grab data from all controls
  $.each($form.serializeArray(), (index, control) => {
    jsonObject[control.name] = control.value.replace(removeTag, "");
  });
  return jsonObject;
}
function newAccount() {
  let User = {};
  User.Name = "";
  User.Email = "";
  User.Password = "";
  User.Avatar = "news-logo-upload.png";
  return User;
}
function renderAccountForm(user = null) {
  //TODO
  let tempEmail;
  let create = user == null;
  if (create) user = newAccount();
  $("#form").show();
  $("#form").empty();
  $("#postsScrollPanel").hide();
  $("#form").append(`
        <form class="formUser" id="userForm">
            <label for="Email" class="form-label">Email </label>
            <input 
                class="form-control"
                name="Email" 
                id="Email" 
                placeholder="Adresse courriel"
                required
                RequireMessage="Veuillez entrer votre adresse courriel"
                InvalidMessage="Votre adresse courriel comporte un caractère illégal"
                value="${user.Email}"
            />
            <label for="Name" class="form-label">Nom</label>
            <input 
                class="form-control"
                name="Name" 
                id="Name" 
                placeholder="Nom"
                required
                RequireMessage="Veuillez entrer votre nom"
                InvalidMessage="Votre nom comporte un caractère illégal"
                value="${user.Name}"
            />
            <label for="Password" class="form-label">Mot de passe</label>
            <input 
              type="password" 
              class="form-control" 
              name="Password" 
              id="Password" 
              placeholder="Mot de passe" 
              required 
              RequireMessage = 'Veuillez entrer un mot de passe'
              InvalidMessage="Veuillez entrer un mot de passe valide"
              value="${user.Password}"/>
            <label class="form-label">Avatar </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${user.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
        </form>
        
            <button id="cancel" class="btn btn-secondary accountFormButton">Annuler</button>
            <button id="disconnect" class="btn btn-secondary accountFormButton">Se déconnecter</button>
    `);
  if (create) $("#keepDateControl").hide();

  initImageUploaders();
  initFormValidation();
  $("#cancel").click(function () {
    showPosts();
  });
  $("#commit").click(function () {
    $("#commit").off();
    return $("#savePost").trigger("click");
  });
  $("#disconnect").click(function () {
    Accounts_API.logout(userToken.User.Id);
    userToken = null;
    showPosts();
  });
  $("#userForm").on("submit", async function (event) {
    event.preventDefault();
    let user = getFormData($("#userForm"));
    if (user.Email != tempEmail) {
      showError("Emails différents", Accounts_API.currentHttpError);
    }

    if (create || !("keepDate" in user))
      user.Created = Local_to_UTC(Date.now());
    delete user.keepDate;
    user = await Accounts_API.Save(user, create);
    if (!Accounts_API.error) {
      await showPosts();
    } else showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
  });
  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
function renderConnectionForm() {
  $("#form").show();
  $("#form").empty();
  $("#postsScrollPanel").hide();
  $("#form").append(`
        <form class="formUser loginForm" id="loginForm">
            <label for="Url" class="form-label">Email</label>
             <input class="form-control" 
                          name="Email" 
                          id="Email"
                          placeholder="Email" 
                          required 
                          RequireMessage = 'Veuillez entrer votre email'></input>

            <label for="Password" class="form-label">Mot de passe</label>
            <input class="form-control" 
                          name="Password"
                          id="Password"
                          placeholder="Mot de passe"
                          type="password"
                          required
                          RequireMessage = 'Veuillez entrer votre mot de passe'>

            </input>
            </br>
            <input type="submit" value="Se connecter" id="login" class="btn btn-primary">
        </form>
        <div class="loginButtons">
            <button id="cancel" class="btn btn-secondary">Annuler</button>
            <button id="register" class="btn btn-secondary">S'inscrire</button>
        </div>
            `);
  $("#cancel").on("click", async function () {
    showPosts();
  });
  $("#register").on("click", async function () {
    renderAccountForm();
  });
  $("#loginForm").on("submit", async function (event) {
    event.preventDefault();
    let user = getFormData($("#loginForm"));
    userToken = await Accounts_API.login(user);
    if(userToken.User.VerifyCode != "verified"){
      renderVerifyForm(userToken.User);
    }
    else{

      if (!Accounts_API.error) {
        await showPosts();
      } else showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
      VerifyIconValidity();
    }
  });
}
function renderVerifyForm(user){
  $("#form").show();
  $("#form").empty();
  hidePosts();
  $("#form").append(`
        <form id="verifyForm">
            <h1>Veuillez entrer votre code de vérification envoyé par courriel</h1>
            <input type="hidden" name="Id" value="${user.Id}"/>
            <input type="text" name="Code" id="Code" placeholder="Code de vérification" required/>
            <input type="submit" value="Envoyer" id="send" class="btn btn-success">
        </form>
  `);
  $("#verifyForm").on("submit", async function (event) {
    event.preventDefault();
    let data = getFormData($("#verifyForm"));
    Accounts_API.Verify(data);
  });

}
async function renderUserManagementForm() {
  let users = await Accounts_API.Get(userToken);
  console.log(users);
  $("#form").show();
  $("#form").empty();
  $("#postsScrollPanel").hide();
  users.data.forEach((user) => {
    if (user.Id == userToken.User.Id) return;
    $("#form").append(renderUserAdminLine(user));
  });
  $(".blockUser").on("click", async function (event) {
    renderBlockForm($(event.target).attr("userId"));
  });
  $(".deleteUser").on("click", async function (event) {
    renderDeleteForm($(event.target).attr("userId"));
  });
  $(".modifyUser").on("click", async function (event) {
    switchPermissions($(event.target).attr("userId"));
  });
}
function renderUserAdminLine(user) {
  return `
    <div class="userLine">
      ${renderUser(user)}
      <i class="cmdIcon fa fa-xmark blockUser" userId="${
        user.Id
      }" title="Bloquer l'utilisateur"></i>
      <i class="cmdIcon fa fa-trash deleteUser" userId="${
        user.Id
      }" title="Supprimer l'utilisateur"></i>
      ${userRightsIcon(user)}
    </div>
    `;
}
function renderUser(user) {
  return `
    <div class="smallUser">
        <img class="UserAvatarXSmall" src="${user.Avatar}"/>
        <div class="smallUserName">${user.Name}</div>
    </div>
  `;
}
function userRightsIcon(user) {
  if (user.isAdmin) {
    return `<i class="fa-solid fa-user-gear modifyUser" userId = ${user.Id} title="Administrateur -> Usager de base"></i>`;
  } else if (user.isSuper) {
    return `<i class="fa-solid fa-user-shield modifyUser" userId = ${user.Id}  title="Super usager -> Administrateur"></i>`;
  } else {
    return `<i class="fa-solid fa-user modifyUser" userId = ${user.Id} title="Usager de base -> Super usager" ></i>`;
  }
}
function renderDeleteForm(userId) {
  $("#form").show();
  $("#form").empty();
  $("#postsScrollPanel").hide();
  $("#form").append(`
    <form id="deleteForm">
        <h1>Voulez-vous vraiment supprimer cet utilisateur?</h1>
        <input type="hidden" name="Id" value="${userId}"/>
        ${renderUser(Accounts_API.Get(userToken, userId))}
        <input type="submit" value="Supprimer" id="delete" class="btn btn-danger">
    </form>
`);
  renderUserManagementForm();
}
function renderBlockForm(userId) {
  renderUserManagementForm();
}
function switchPermissions(userId) {}
