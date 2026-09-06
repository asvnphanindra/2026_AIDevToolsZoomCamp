from django.urls import path

from chores import views

app_name = "chores"

urlpatterns = [
    path("chores/one-off/", views.create_one_off, name="create_one_off"),
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
