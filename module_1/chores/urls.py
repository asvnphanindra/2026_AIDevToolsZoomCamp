from django.urls import path

from chores import views

app_name = "chores"

urlpatterns = [
    path("", views.chore_list, name="chore_list"),
    path("chores/one-off/", views.create_one_off, name="create_one_off"),
    path(
        "chores/one-off/html/",
        views.create_one_off_html,
        name="create_one_off_html",
    ),
    path("chores/<int:chore_id>/claim/", views.claim, name="claim_chore"),
    path(
        "chores/<int:chore_id>/claim/html/",
        views.claim_html,
        name="claim_html",
    ),
    path("chores/<int:chore_id>/release/", views.release, name="release_chore"),
    path(
        "chores/<int:chore_id>/release/html/",
        views.release_html,
        name="release_html",
    ),
    path(
        "chores/<int:chore_id>/complete/",
        views.complete,
        name="complete_chore",
    ),
    path(
        "chores/<int:chore_id>/complete/html/",
        views.complete_html,
        name="complete_html",
    ),
    path("chores/templates/", views.create_template, name="create_template"),
    path(
        "chores/templates/<int:template_id>/",
        views.update_template,
        name="update_template",
    ),
    path(
        "chores/templates/<int:template_id>/deactivate/",
        views.deactivate_template,
        name="deactivate_template",
    ),
]
