"use strict";
// 标记当前元素已经被创建并绑定
var bindMark = '__bind_remark';
var defalutUserName = 'default_user';
/**
 * 获取 github 用户名
 * @returns {string}
 * @private
 */
var _get_github_username = function () {
    var metas = document.getElementsByTagName('meta');
    var username = defalutUserName;
    for (var i = 0; i < metas.length; i++) {
        if (metas[i].getAttribute('name') === 'user-login' && metas[i].getAttribute('content') != '') {
            username = metas[i].getAttribute('content');
            break;
        }
    }

    return username;
};

/**
 * 创建组件
 * @param el 需要被绑定的元素
 * @param project_name 项目名称
 * @returns
 * @private
 */
var _create_project_remark_dom = function (el, project_name) {
    // 如果 dom 已经被创建则直接返回 true
    if (el.getAttribute != null &&
        el.getAttribute('class') != null &&
        el.getAttribute('class').indexOf(bindMark) !== -1)
        return true;

    // 调整元素位置，以供 input 填充
    el.style.marginBottom = '30px';
    el.style.display = 'block';
    // 打上标记，防止重复绑定
    el.setAttribute('class', el.getAttribute('class') + ' ' + bindMark);
    var vue = new Vue({
            data: {
                name: project_name,
                value: ''
            },
            created: function () {
                var that = this;
                _get_project_remarks(project_name, _get_github_username(), function (rsp) {
                    that.value = rsp;
                });
            },
            render: function (h) {
                var that = this;
                return h('input', {
                    'class': {
                        'git_remarks_plugin__input': true
                    },
                    domProps: {
                        value: that.value
                    },
                    attrs: {
                        autocapitalize: 'off',  // 禁止自动填充
                        spellcheck: 'false',    // 禁止拼写检查
                        placeholder: 'input the project remarks...'
                    },
                    on: {
                        change: function (event) {
                            _save_project_remarks(project_name, _get_github_username(), event.target.value)
                        }
                    },
                    key: project_name
                })
            }
        })
    ;
    var input = vue.$mount();
    el.parentNode.insertBefore(input.$el, el);
    return input;
};

/**
 * 绑定组件到相关元素中
 * @private
 */
var _bind_project_remarks = function () {
    var project, projects, project_name, i;
    // 项目页
    if (document.getElementsByClassName('repohead-details-container').length === 1 &&
        document.getElementsByClassName('repohead-details-container')[0].getElementsByTagName('h1').length === 1) {
        project = document.getElementsByClassName('repohead-details-container')[0].getElementsByTagName('h1')[0];
        projects = project.getElementsByTagName('a');
        for (i = 0; i < projects.length; i++) {
            if (projects[i].getAttribute('data-pjax') !== null) {
                project_name = project.getElementsByTagName('a')[i].getAttribute('href');
                break;
            }
        }

        _create_project_remark_dom(project, project_name);
        return true;
    }

    // 个人中心列表页
    if (document.getElementsByClassName('user-profile-repo-filter').length === 1 &&
        document.getElementsByTagName('h3').length > 0) {
        projects = document.getElementsByTagName('h3');
        for (i = 0; i < projects.length; i++) {
            if (projects[i].getElementsByTagName('a').length === 1) {
                project_name = projects[i].getElementsByTagName('a')[0].getAttribute('href');

                if (project_name !== null)
                    _create_project_remark_dom(projects[i], project_name);
            }
        }
        return true;
    }

    // repositories 元素
    if (document.getElementsByClassName('js-pinned-repos-reorder-container').length === 1 &&
        document.getElementsByClassName('pinned-repo-item').length > 0) {
        projects = document.getElementsByClassName('pinned-repo-item');
        for (i = 0; i < projects.length; i++) {
            var a = projects[i].getElementsByTagName('a');
            for (var ii = 0; ii < a.length; ii++) {
                if (a[ii].getElementsByTagName('span').length === 1) {
                    project_name = a[ii].getAttribute('herf');

                    _create_project_remark_dom(a[ii], project_name);
                    break;
                }
            }
        }
        return true;
    }
};

/**
 * 读取配置项
 * @param project_name 项目名称
 * @param username 用户名
 * @param callback 回调
 * @private
 */
var _get_project_remarks = function (project_name, username, callback) {
    if (project_name == null && username == null) {
        chrome.storage.sync.get({remarks: {}}, function (rsp) {
            callback(rsp);
        });
    } else {
        chrome.storage.sync.get({remarks: {}}, function (rsp) {
            if (project_name != null && username != null) {
                if (rsp.remarks != null &&
                    rsp.remarks[project_name] != null &&
                    rsp.remarks[project_name][username] != null) {
                    callback(rsp.remarks[project_name][username]);
                    return true;
                } else {
                    callback("");
                    return true;
                }
            }
        });
    }
};

/**
 * 保存用户设置
 * @param project_name
 * @param username
 * @param value
 * @private
 */
var _save_project_remarks = function (project_name, username, value) {
    _get_project_remarks(null, null, function (rsp) {
        var items = rsp;

        if (items.remarks[project_name] == null)
            items.remarks[project_name] = {};

        items.remarks[project_name][username] = value;
        chrome.storage.sync.set(items);
    });
};

/**
 * 监听 dom 的刷新以重新绑定相关组件
 * @param dom 需要监听的 dom
 * @private
 */
var _watch_dom_flash = function (dom) {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    var observer = new MutationObserver(function (mutations) {
        _bind_project_remarks()
    });
    observer.observe(dom, {
        childList: true,
        subtree: true,
        characterData: true
    });
};

/**
 * 窗口载入完毕执行
 */
document.addEventListener("DOMContentLoaded", function () {
    // 绑定组件
    _bind_project_remarks();
    // 监听 github dom 刷新
    if (document.getElementById('js-pjax-container') != null) {
        _watch_dom_flash(document.getElementById('js-pjax-container'));
    } else if (document.getElementById('js-repo-pjax-container') != null) {
        _watch_dom_flash(document.getElementById('js-repo-pjax-container'));
    }
}, false);