class Accounts_API {
  static Host_URL() {
    return "http://localhost:5000";
  }
  static API_URL() {
    return this.Host_URL() + "/accounts";
  }
  static LOGIN_URL() {
    return this.Host_URL() + "/token";
  }

  static initHttpState() {
    this.currentHttpError = "";
    this.currentStatus = 0;
    this.error = false;
  }
  static setHttpErrorState(xhr) {
    if (xhr.responseJSON)
      this.currentHttpError = xhr.responseJSON.error_description;
    else
      this.currentHttpError =
        xhr.statusText == "error" ? "Service introuvable" : xhr.statusText;
    this.currentStatus = xhr.status;
    this.error = true;
  }
  static async HEAD() {
    Posts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.API_URL(),
        type: "HEAD",
        contentType: "text/plain",
        complete: (data) => {
          resolve(data.getResponseHeader("ETag"));
        },
        error: (xhr) => {
          Posts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async login(data){
    Accounts_API.initHttpState();
    return new Promise(resolve => {
        $.ajax({
            url: this.LOGIN_URL(),
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: (data) => { resolve(data); },
            error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
        });
    });
}
  static async logout(userId){
    Posts_API.initHttpState();
    return new Promise((resolve) => {
        $.ajax({
          url: this.API_URL() + "/logout?userId="+ userId,
          complete: (data) => {
            resolve({
              ETag: data.getResponseHeader("ETag"),
              data: data.responseJSON,
            });
          }
        });
      });
  }
  static async Get(user,id = null) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.API_URL() + (id != null ? "/" + id : ""),
        headers: {
          authorization: user.Access_token,
        },
        complete: (data) => {
          resolve({
            ETag: data.getResponseHeader("ETag"),
            data: data.responseJSON,
          });
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async GetQuery(queryString = "") {
    Posts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.API_URL() + queryString,
        complete: (data) => {
          resolve({
            ETag: data.getResponseHeader("ETag"),
            data: data.responseJSON,
          });
        },
        error: (xhr) => {
          Posts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Verify(data){
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
    $.ajax({
      url: this.API_URL() + "/verify?id=" + data.Id+"&code=" + data.Code,
      type: "GET",
      success: (data) => { resolve(data); },
      error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
    })
    });
  }
  static async Save(data, create = true) {
    Accounts_API.initHttpState();
    let headerVariables;
    if(data.Access_token)
      headerVariables = {
        authorization: data.Access_token
    }
    return new Promise((resolve) => {
      $.ajax({
        url: create ? this.API_URL() + "/register" : this.API_URL() + "/modify/" + data.Id,
        type: create ? "POST" : "PUT",
        headers: {
          headerVariables
        },
        contentType: "application/json",
        data: JSON.stringify(data),
        success: (data) => {
          resolve(data);
        },
        error: (xhr) => {
          Posts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Delete(id) {
    return new Promise((resolve) => {
      $.ajax({
        url: this.API_URL() + "/" + id,
        headers: {
          authorization: user.Access_token,
        },
        type: "DELETE",
        complete: () => {
          Posts_API.initHttpState();
          resolve(true);
        },
        error: (xhr) => {
          Posts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
}
