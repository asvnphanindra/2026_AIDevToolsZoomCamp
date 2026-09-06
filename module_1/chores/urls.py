from django.urls import path

from chores import views

app_name = "chores"

urlpatterns = [
    path("chores/one-off/", views.create_one_off, name="create_one_off"),
]
