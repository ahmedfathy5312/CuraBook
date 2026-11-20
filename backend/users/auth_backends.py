import logging
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.contrib.auth.base_user import BaseUserManager
from django.core.validators import validate_email
from django.core.exceptions import ValidationError


logger = logging.getLogger(__name__)

UserModel = get_user_model()

class UsernameOrEmailBackend(ModelBackend):
    def authenticate(self, request , username=None, password=None, **kwargs):
        if username is None:
            username =kwargs.get('email')

        if username is None or password is None:  
            return None 

        username =username.strip() 

        is_email = False
        try:
            validate_email(username) 
            is_email = True
        except ValidationError:
            is_email = False

        try:
            if is_email:
                normalized = BaseUserManager().normalize_email(username) 
                user = UserModel.objects.filter(email__iexact=normalized).first()
            else:
                user = UserModel.objects.filter(username__iexact=username).first()
            if user is None:
                logger.warning("Authentication failed: no user found for '%s'", username)
                return None    
        except Exception as exc:
            logger.exception("Error retrieving user for authentication: %s",exc)
            return None
        
        if user.check_password(password) and self.user_can_authenticate(user):
                return user
      

        logger.warning("Authentication failed: wrong password for '%s'",username)
        return None




